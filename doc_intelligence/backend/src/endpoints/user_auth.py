from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from src.services.model_dependencies.session_maker import get_async_session
from src.schemas.auth_schema import LoginRequest, RegisterRequest, UserResponse, RoleAssignmentRequest, UserDeletionRequest
from src.models.usersdb import Users
from src.services.auth.jwt_handler import create_access_token
from src.services.auth.jwt_dependency import get_current_user

user_auth_router = APIRouter(prefix="/auth", tags=["auth"])
password_context = CryptContext(schemes=["argon2"], deprecated="auto")

# ---------------------------------------------------------------------------------------
# GET
#----------------------------------------------------------------------------------------
@user_auth_router.get("/all_users")
async def get_all_users(
    session: AsyncSession = Depends(get_async_session), 
    current_user: Users = Depends(get_current_user)
    ):
    
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

# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------
@user_auth_router.post("/login")
async def login(
    data: LoginRequest, 
    session: AsyncSession = Depends(get_async_session)
):
    # Check if user exists
    result = await session.execute(select(Users).where(Users.username == data.username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User does not exist.")
    if not password_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    
    # Create access token
    access_token = create_access_token(data={"sub": user.username})

    return {"access_token": access_token,
            "token_type": "bearer",
            "username": data.username,
            "role": user.role}

    
@user_auth_router.post("/register")
async def register(
    data: RegisterRequest, 
    session: AsyncSession = Depends(get_async_session)
):
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

# ---------------------------------------------------------------------------------------
# PUT
#----------------------------------------------------------------------------------------
@user_auth_router.put("/assign_role")
async def assign_role(
    data: RoleAssignmentRequest,
    session: AsyncSession = Depends(get_async_session), 
    current_user: Users = Depends(get_current_user)
):
    # Only Admins can assign roles
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized.")

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

# ---------------------------------------------------------------------------------------
# DELETE
#----------------------------------------------------------------------------------------
@user_auth_router.delete("/delete_user")
async def delete_user(
    data: UserDeletionRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: Users = Depends(get_current_user)
):
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

    return {"message": f"User {data.username} deleted."}
