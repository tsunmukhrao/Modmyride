import base64
import hashlib
import hmac
import json
import time

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def make_token(secret: str, order_id: str) -> str:
    payload = {"order": order_id, "exp": int(time.time()) + 600, "nonce": "test-nonce-123456"}
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def test_demo_qr_requires_signed_token_and_encodes_pay_page_url():
    settings = Settings(demo_payment_secret="test-secret", public_app_url="https://shop.example")
    token = make_token("test-secret", "20de9fee-a887-47ee-a648-9ef28de8a2e2")
    with TestClient(create_app(settings=settings)) as client:
        response = client.get("/api/payments/demo-qr", params={"token": token})
        rejected = client.get("/api/payments/demo-qr", params={"token": token + "bad"})
    assert response.status_code == 200
    assert b"<svg" in response.content
    assert rejected.status_code == 410
