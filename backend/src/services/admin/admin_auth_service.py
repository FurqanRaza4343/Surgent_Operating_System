from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

import jwt

from src.config import get_settings

settings = get_settings()

# Deliberately its own signing scheme (HS256, own secret) — not Clerk's
# RS256/JWKS. Distinguishing claim (`iss`) lets verify_admin_token reject a
# stray Clerk token outright instead of failing confusingly deep in jwt.decode.
ISSUER = "aiaceone-admin"


def authenticate(username: str, password: str) -> bool:
    # Single hardcoded operator account by design (see config.py) — not a
    # multi-user table. secrets.compare_digest avoids a timing side-channel
    # on the comparison even though the stakes here are low.
    return secrets.compare_digest(username, settings.admin_username) and secrets.compare_digest(
        password, settings.admin_password
    )


def create_admin_token() -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "iss": ISSUER,
        "sub": settings.admin_username,
        "role": "platform_admin",
        "iat": now,
        "exp": now + timedelta(minutes=settings.admin_jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.admin_jwt_secret, algorithm="HS256")


def verify_admin_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.admin_jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if payload.get("iss") != ISSUER or payload.get("role") != "platform_admin":
        return None
    return payload
