from fastapi.testclient import TestClient

from app.main import create_app
from app.auth import get_current_user
from app.commerce.shipping import estimate_shipping
from app.supabase import get_supabase


def test_india_shipping_estimate_validates_pin_and_returns_labeled_demo_band():
    assert estimate_shipping("560001") == {
        "postalCode": "560001", "method": "Standard demo delivery", "amount": 149.0,
        "etaMinDays": 4, "etaMaxDays": 8, "currency": "INR", "isDemo": True,
    }


def test_shipping_endpoint_rejects_invalid_pin_and_accepts_identifiers_only():
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
    app.dependency_overrides[get_supabase] = lambda: object()
    with TestClient(app) as client:
        invalid = client.post("/api/shipping/estimate", json={"postalCode": "5600", "items": []})
        valid = client.post("/api/shipping/estimate", json={
            "postalCode": "110001", "items": [{"productId": "20de9fee-a887-47ee-a648-9ef28de8a2e2", "quantity": 1}],
        })
    assert invalid.status_code == 400
    assert valid.status_code == 200
    assert valid.json()["isDemo"] is True
    assert valid.json()["amount"] == 99.0
