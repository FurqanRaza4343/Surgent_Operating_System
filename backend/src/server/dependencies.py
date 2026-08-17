from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.server.exceptions import UnauthorizedException
from src.services.clerk.clerk_service import ClerkService


async def get_current_user(
    authorization: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not authorization.startswith("Bearer "):
        raise UnauthorizedException("Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "")
    clerk = ClerkService()
    user = await clerk.verify_token(token)

    if not user:
        raise UnauthorizedException("Invalid or expired token")

    return user


async def get_optional_user(
    authorization: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")
    clerk = ClerkService()
    user = await clerk.verify_token(token)
    return user
