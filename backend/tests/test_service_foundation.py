from fastapi import Depends
from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.config import Settings
from app.main import create_app
from app.supabase import get_supabase


def test_health_route_reports_service_ready():
    client = TestClient(create_app(settings=Settings()))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "modmyride-api"}


def test_supabase_settings_accept_existing_next_public_environment_names(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://store.supabase.co")
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key")

    settings = Settings(_env_file=None)

    assert settings.supabase_url == "https://store.supabase.co"
    assert settings.supabase_anon_key == "public-key"


def test_cors_allows_configured_storefront_origin():
    app = create_app(settings=Settings(cors_origins=["http://localhost:3000"]))
    client = TestClient(app)

    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_supabase_client_is_created_lazily_and_can_be_injected():
    fake_client = object()
    app = create_app(
        settings=Settings(
            supabase_url="https://example.supabase.co",
            supabase_service_role_key="service-key",
        ),
        supabase_client_factory=lambda url, key: fake_client,
    )

    app.add_api_route(
        "/test/supabase",
        lambda supabase=Depends(get_supabase): {"is_fake": supabase is fake_client},
    )

    with TestClient(app) as client:
        first = client.get("/test/supabase")
        second = client.get("/test/supabase")

    assert first.status_code == second.status_code == 200
    assert first.json() == {"is_fake": True}
    assert second.json() == {"is_fake": True}
    assert app.state.supabase is fake_client


def test_supabase_dependency_fails_closed_when_server_credentials_are_missing():
    app = create_app(settings=Settings())
    app.add_api_route(
        "/test/supabase",
        lambda supabase=Depends(get_supabase): {"configured": supabase is not None},
    )

    with TestClient(app) as client:
        response = client.get("/test/supabase")

    assert response.status_code == 503


def test_current_user_requires_a_validated_bearer_token(monkeypatch):
    app = create_app(settings=Settings())
    app.add_api_route(
        "/test/user",
        lambda user=Depends(get_current_user): {"id": user["id"]},
    )

    async def verified_user(token, settings):
        assert token == "signed-session-token"
        return {"id": "verified-user"}

    monkeypatch.setattr("app.auth.verify_access_token", verified_user)

    with TestClient(app) as client:
        missing = client.get("/test/user")
        accepted = client.get("/test/user", headers={"Authorization": "Bearer signed-session-token"})

    assert missing.status_code == 401
    assert accepted.status_code == 200
    assert accepted.json() == {"id": "verified-user"}
