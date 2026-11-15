from fastapi.testclient import TestClient

from app.auth import get_current_user, require_admin
from app.main import create_app
from app.supabase import get_supabase


class Query:
    def __init__(self, rows): self.rows = rows
    def select(self, *_args, **_kwargs): return self
    def eq(self, *_args, **_kwargs): return self
    def order(self, *_args, **_kwargs): return self
    def limit(self, *_args, **_kwargs): return self
    def range(self, *_args, **_kwargs): return self
    def execute(self): return type("Result", (), {"data": self.rows})()


class ReadClient:
    def table(self, name):
        rows = {
            "profiles": [{"full_name": "Driver", "phone": "", "role": "customer", "vehicle_make": None, "vehicle_model": None, "vehicle_year": None}],
            "orders": [], "products": [], "categories": [], "brands": [], "vehicles": [], "payments": [],
        }.get(name, [])
        return Query(rows)


def test_account_identity_is_returned_by_python_api():
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1", "email": "driver@example.test"}
    app.dependency_overrides[get_supabase] = ReadClient
    with TestClient(app) as client:
        response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["profile"]["full_name"] == "Driver"


def test_admin_dashboard_route_requires_admin_dependency():
    app = create_app()
    app.dependency_overrides[require_admin] = lambda: {"id": "admin-1"}
    app.dependency_overrides[get_supabase] = ReadClient
    with TestClient(app) as client:
        response = client.get("/api/admin/dashboard")
    assert response.status_code == 200
    assert set(response.json()) == {"products", "orders", "categories", "brands", "vehicles"}
