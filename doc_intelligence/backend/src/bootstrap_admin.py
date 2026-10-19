import argparse
import asyncio
from getpass import getpass

from passlib.context import CryptContext
from sqlalchemy import select

from src.models.usersdb import Users
from src.services.model_dependencies.database import Base, engine
from src.services.model_dependencies.session_maker import async_session_maker

password_context = CryptContext(schemes=["argon2"], deprecated="auto")


async def bootstrap_admin(username: str, email: str, password: str) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with async_session_maker() as session:
        existing_admin = await session.scalar(
            select(Users.id).where(Users.role == "Admin").limit(1)
        )
        if existing_admin is not None:
            raise RuntimeError("An administrator already exists; bootstrap is disabled.")

        session.add(
            Users(
                username=username,
                email=email,
                password_hash=password_context.hash(password),
                role="Admin",
            )
        )
        await session.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the initial Admin account.")
    parser.add_argument("username")
    parser.add_argument("email")
    args = parser.parse_args()

    password = getpass("Admin password: ")
    confirmation = getpass("Confirm password: ")
    if not password or password != confirmation:
        parser.error("Passwords must be non-empty and match.")

    async def run() -> None:
        try:
            await bootstrap_admin(args.username, args.email, password)
        finally:
            await engine.dispose()

    asyncio.run(run())

    print(f"Created initial Admin account: {args.username}")


if __name__ == "__main__":
    main()
