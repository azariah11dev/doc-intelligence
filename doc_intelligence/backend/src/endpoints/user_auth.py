from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from src.services.model_dependencies.session_maker import get_async_session
from src.schemas.auth_schema import LoginRequest, RegisterRequest, UserResponse, RoleAssignmentRequest, UserDeletionRequest
from src.models.usersdb import Users
from src.services.auth.jwt_handler import create_access_token
from src.services.auth.jwt_dependency import get_current_user
from src.services.rate_limit import limiter
from src.schemas.env_schema import settings
from src.services.utils.error_logger import generate_logs


user_auth_router = APIRouter(prefix="/auth", tags=["auth"])
password_context = CryptContext(schemes=["argon2"], deprecated="auto")
_DUMMY_PASSWORD_HASH = password_context.hash("nonexistent-user-password")

# ---------------------------------------------------------------------------------------
# GET
#----------------------------------------------------------------------------------------
@user_auth_router.get("/all_users")
async def get_all_users(
    session: AsyncSession = Depends(get_async_session), 
    current_user: Users = Depends(get_current_user)
    ):
    try:
        if current_user.role != "Admin":
            raise HTTPException(status_code=403, detail="Not authorized.")

        result = await session.execute(select(Users))
        users = result.scalars().all()

        return [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role
            }
            for u in users
        ]

    except HTTPException:
        raise

    except Exception as e:
        generate_logs(error=e,endpoint="/auth/all_users")
        raise HTTPException(status_code=500, detail="Internal server error") from e

# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------
@user_auth_router.post("/login")
@limiter.limit(settings.LOGIN_RATE_LIMIT)
async def login(
    request: Request,
    data: LoginRequest, 
    session: AsyncSession = Depends(get_async_session)
):
    try:
        # Check if user exists
        result = await session.execute(select(Users).where(Users.username == data.username))
        user = result.scalar_one_or_none()
        
        password_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
        if not password_context.verify(data.password, password_hash) or not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
        # Create access token
        access_token = create_access_token(data={"sub": user.username})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "username": data.username,
            "role": user.role
        }

    except HTTPException:
        raise

    except Exception as e:
        generate_logs(error=e,endpoint="/auth/all_users")
        raise HTTPException(status_code=500, detail="Internal server error") from e

    
@user_auth_router.post("/register")
@limiter.limit(settings.REGISTER_RATE_LIMIT)
async def register(
    request: Request,
    data: RegisterRequest, 
    session: AsyncSession = Depends(get_async_session)
):
    try:
        # check if username already exists
        user_result = await session.execute(select(Users).where(Users.username == data.username))

        if user_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already exists.")

        email_result = await session.execute(select(Users).where(Users.email == data.email))
        if email_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already exists.")
    
        # Hash password
        hashed_password = password_context.hash(data.password)

        # Create new user
        new_user = Users(username=data.username, email=data.email, password_hash=hashed_password)

        #Add to DB
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)

        return {
            "message": "Registration successful!", 
            "user": UserResponse.model_validate(new_user)
        }

    except HTTPException:
        raise

    except Exception as e:
        generate_logs(error=e,endpoint="/auth/all_users")
        raise HTTPException(status_code=500, detail="Internal server error") from e

# ---------------------------------------------------------------------------------------
# PUT
#----------------------------------------------------------------------------------------
@user_auth_router.put("/assign_role")
async def assign_role(
    data: RoleAssignmentRequest,
    session: AsyncSession = Depends(get_async_session), 
    current_user: Users = Depends(get_current_user)
):
    try:
        # Only Admins can assign roles
        if current_user.role != "Admin":
            raise HTTPException(status_code=403, detail="Not authorized.")

        if current_user.username == data.username:
            raise HTTPException(status_code=400, detail=f"{current_user.username} cannot change their own role to {data.role}")

        allowed_roles = ["Admin", "User"]

        if data.role not in allowed_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Allowed roles are: {', '.join(allowed_roles)}")
    
        result = await session.execute(select(Users).where(Users.username == data.username))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
    
        user.role = data.role
        await session.commit()
        await session.refresh(user)

        return {"message": f"{data.role} assigned to user {data.username}."}

    except HTTPException:
        raise

    except Exception as e:
        generate_logs(error=e,endpoint="/auth/all_users")
        raise HTTPException(status_code=500, detail="Internal server error") from e

# ---------------------------------------------------------------------------------------
# DELETE
#----------------------------------------------------------------------------------------
@user_auth_router.delete("/delete_user")
async def delete_user(
    data: UserDeletionRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user)
):
    try:
        # Only Admins can delete users
        if current_user.role != "Admin":
            raise HTTPException(status_code=403, detail="Not authorized.")

        # Prevent Admin from deleting themselves
        if data.username == current_user.username:
            raise HTTPException(status_code=400, detail="Admins cannot delete themselves.")

        result = await session.execute(
            select(Users).where(Users.username == data.username)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        await session.delete(user)
        await session.commit()

        return {"message": f"User {data.username} has been deleted."}

    except HTTPException:
        raise

    except Exception as e:
        generate_logs(error=e,endpoint="/auth/all_users")
        raise HTTPException(status_code=500, detail="Internal server error") from e
