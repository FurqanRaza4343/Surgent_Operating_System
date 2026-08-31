from __future__ import annotations
import httpx
import jwt
from jwt import PyJWKClient

from src.config import get_settings
from src.server.exceptions import AppException

settings = get_settings()


class ClerkService:
    def __init__(self):
        self.secret_key = settings.clerk_secret_key
        self.jwks_url = settings.clerk_jwks_url
        self.base_url = "https://api.clerk.com/v1"

    async def verify_token(self, token: str) -> dict | None:
        try:
            jwks_client = PyJWKClient(self.jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=None,
                options={"verify_exp": True},
            )

            return {
                "sub": payload.get("sub"),
                "email": payload.get("email"),
                "name": payload.get("name"),
            }
        except Exception:
            return None

    async def get_user(self, clerk_user_id: str) -> dict | None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {self.secret_key}"},
            )
            if resp.status_code == 200:
                return resp.json()
            return None

    async def invite_user(self, email: str, redirect_url: str, public_metadata: dict) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/invitations",
                json={
                    "email_address": email,
                    "redirect_url": redirect_url,
                    "public_metadata": public_metadata,
                },
                headers={"Authorization": f"Bearer {self.secret_key}"},
            )
            if resp.status_code in (200, 201):
                return resp.json()
            # Clerk's error body carries the real, specific reason (e.g.
            # "That email address is taken." when inviting an email that
            # already has an account) — surface that instead of a generic
            # failure, same reasoning as apiFetch()'s fix on the frontend.
            detail = "Failed to send invitation"
            try:
                errors = resp.json().get("errors") or []
                if errors and errors[0].get("message"):
                    detail = errors[0]["message"]
            except ValueError:
                pass
            raise AppException(detail)
