from functools import lru_cache
from typing import Annotated

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env.local", "../.env.development.local"),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    supabase_url: Annotated[
        str | None,
        Field(validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")),
    ] = None
    supabase_anon_key: Annotated[
        str | None,
        Field(validation_alias=AliasChoices("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY")),
    ] = None
    supabase_service_role_key: str | None = None
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    payment_provider: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
