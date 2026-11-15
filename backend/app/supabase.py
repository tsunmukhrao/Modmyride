from collections.abc import Callable
from typing import Any

from fastapi import HTTPException, Request

from app.config import Settings

SupabaseClientFactory = Callable[[str, str], Any]


def create_supabase_client(url: str, service_role_key: str) -> Any:
    from supabase import create_client

    return create_client(url, service_role_key)


def get_supabase(request: Request) -> Any:
    existing = getattr(request.app.state, "supabase", None)
    if existing is not None:
        return existing

    settings: Settings = request.app.state.settings
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="Supabase server access is not configured.")

    factory: SupabaseClientFactory = request.app.state.supabase_client_factory
    client = factory(settings.supabase_url, settings.supabase_service_role_key)
    request.app.state.supabase = client
    return client
