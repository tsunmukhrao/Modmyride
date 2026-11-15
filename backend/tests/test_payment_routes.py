from fastapi.testclient import TestClient

from app.main import create_app


def test_webhook_rejects_unknown_provider_without_provider_specific_coupling():
    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/api/webhooks/unknown-gateway",
            content=b'{"event":"payment.captured"}',
            headers={"x-payment-signature": "signature", "x-payment-event-id": "evt-1"},
        )

    assert response.status_code == 503
    assert response.json() == {"error": "Payment provider is not configured."}


def test_payment_verification_requires_user_authentication():
    app = create_app()

    with TestClient(app) as client:
        response = client.post("/api/payments/verify", json={
            "provider": "gateway",
            "internalOrderId": "20de9fee-a887-47ee-a648-9ef28de8a2e2",
            "providerReference": "provider-order-1",
            "payload": {"signature": "sample"},
        })

    assert response.status_code == 401
