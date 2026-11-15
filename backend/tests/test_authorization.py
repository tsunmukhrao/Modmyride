from fastapi import Depends
from fastapi.testclient import TestClient

from app.auth import get_current_user, require_admin
from app.main import create_app
from app.supabase import get_supabase


class ProfileQuery:
    def __init__(self, role):
        self.role = role

    def select(self, *_args):
        return self

    def eq(self, _field, _value):
        return self

    def limit(self, _value):
        return self

    def execute(self):
        rows = [{"role": self.role}] if self.role else []
        return type("Result", (), {"data": rows})()


class ProfileClient:
    def __init__(self, role):
        self.role = role

    def table(self, _name):
        return ProfileQuery(self.role)


def make_admin_test_app(role):
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {"id": "verified-user", "role": "admin"}
    app.dependency_overrides[get_supabase] = lambda: ProfileClient(role)
    app.add_api_route("/admin-check", lambda user=Depends(require_admin): {"id": user["id"]})
    return app


def test_admin_role_is_loaded_from_supabase_not_user_claims():
    with TestClient(make_admin_test_app("customer")) as client:
        response = client.get("/admin-check")

    assert response.status_code == 403
    assert response.json() == {"error": "Administrator access required."}


def test_profile_admin_is_allowed():
    with TestClient(make_admin_test_app("admin")) as client:
        response = client.get("/admin-check")

    assert response.status_code == 200
    assert response.json() == {"id": "verified-user"}
