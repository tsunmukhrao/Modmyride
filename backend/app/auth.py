from typing import Any

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.supabase import get_supabase

bearer_scheme = HTTPBearer(auto_error=False)


async def verify_access_token(token: str, settings: Settings) -> dict[str, Any]:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured.")

    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {token}"},
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired access token.")

    user = response.json()
    if not isinstance(user, dict) or not isinstance(user.get("id"), str):
        raise HTTPException(status_code=401, detail="Invalid or expired access token.")
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="A bearer access token is required.")
    return await verify_access_token(credentials.credentials, settings)


def require_admin(
    user: dict[str, Any] = Depends(get_current_user),
    client: Any = Depends(get_supabase),
) -> dict[str, Any]:
    try:
        result = client.table("profiles").select("role").eq("id", user["id"]).limit(1).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not verify administrator access.") from exc
    profiles = result.data or []
    if not profiles or profiles[0].get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return user
