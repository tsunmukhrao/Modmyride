from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.main import create_app
from app.routes.checkout import CheckoutItem


def test_checkout_fails_closed_without_gateway_before_creating_order():
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
    order_calls = []

    with TestClient(app) as client:
        response = client.post("/api/orders", json={
            "items": [{"productId": "20de9fee-a887-47ee-a648-9ef28de8a2e2", "quantity": 1}],
            "shipping": {"recipient": "A Singh", "phone": "9876543210", "line1": "12 MG Road", "city": "Bengaluru", "region": "Karnataka", "postalCode": "560001", "countryCode": "IN"},
            "idempotencyKey": "checkout-run-0001",
        })

    assert response.status_code == 503
    assert response.json() == {"error": "No payment gateway is configured; no order was created."}
    assert order_calls == []


def test_checkout_item_preserves_optional_product_variant_id():
    item = CheckoutItem.model_validate({"productId": "20de9fee-a887-47ee-a648-9ef28de8a2e2", "variantId": "560b225c-b379-430d-b5e8-0606b52d1ce0", "quantity": 2})
    assert str(item.variantId) == "560b225c-b379-430d-b5e8-0606b52d1ce0"
