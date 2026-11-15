from fastapi.testclient import TestClient

from app.auth import get_current_user, require_admin
from app.main import create_app
from app.supabase import get_supabase


def test_admin_catalog_rejects_customer_and_requires_admin_profile():
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}

    class CustomerClient:
        def table(self, _name):
            return self
        def select(self, *_args): return self
        def eq(self, *_args): return self
        def limit(self, *_args): return self
        def execute(self): return type("Result", (), {"data": [{"role": "customer"}]})()

    app.dependency_overrides[get_supabase] = CustomerClient

    with TestClient(app) as client:
        response = client.post("/api/admin/products", json={})

    assert response.status_code == 403
    assert response.json() == {"error": "Administrator access required."}


def test_admin_product_rejects_invalid_fields_before_database_write():
    app = create_app()
    app.dependency_overrides[require_admin] = lambda: {"id": "admin-1"}

    with TestClient(app) as client:
        response = client.post("/api/admin/products", json={"sku": "x", "name": "A"})

    assert response.status_code == 400
    assert "error" in response.json()
