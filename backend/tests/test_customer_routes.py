from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.main import create_app
from app.routes.customers import CartLine
from app.supabase import get_supabase


def test_cart_sync_requires_authenticated_user():
    app = create_app()

    with TestClient(app) as client:
        response = client.put("/api/cart", json={"lines": []})

    assert response.status_code == 401
    assert response.json() == {"error": "A bearer access token is required."}


def test_cart_sync_validates_lines_before_database_write():
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}

    with TestClient(app) as client:
        response = client.put("/api/cart", json={"lines": [{"productId": "not-a-uuid", "quantity": 51}]})

    assert response.status_code == 400
    assert "error" in response.json()


def test_cart_get_returns_empty_guest_cart_without_authentication():
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/cart")

    assert response.status_code == 200
    assert response.json() == {"authenticated": False, "lines": []}


def test_cart_line_preserves_optional_product_variant_id():
    line = CartLine.model_validate({"productId": "20de9fee-a887-47ee-a648-9ef28de8a2e2", "variantId": "560b225c-b379-430d-b5e8-0606b52d1ce0", "quantity": 2})
    assert str(line.variantId) == "560b225c-b379-430d-b5e8-0606b52d1ce0"
