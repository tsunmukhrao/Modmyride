from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from io import BytesIO
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from qrcode import QRCode
from qrcode.image.svg import SvgPathImage

from app.supabase import get_supabase

router = APIRouter(tags=["demo checkout"])
TOKEN_LIFETIME_SECONDS = 10 * 60


def _secret(request: Request) -> bytes:
    settings = request.app.state.settings
    value = settings.demo_payment_secret or settings.supabase_service_role_key
    if not value:
        raise HTTPException(status_code=503, detail="Demo checkout is not configured.")
    return value.encode()


def create_demo_token(request: Request, order_id: str) -> tuple[str, int]:
    expires = int(time.time()) + TOKEN_LIFETIME_SECONDS
    payload = {"order": order_id, "exp": expires, "nonce": secrets.token_urlsafe(18)}
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(_secret(request), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}", expires


def read_demo_token(request: Request, token: str) -> dict[str, object]:
    try:
        encoded, signature = token.split(".", 1)
        expected = hmac.new(_secret(request), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("invalid signature")
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if not isinstance(payload, dict) or int(payload["exp"]) < int(time.time()):
            raise ValueError("expired token")
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=410, detail="This demo payment link is invalid or expired.") from exc


def demo_payment_details(request: Request, token: str) -> tuple[dict[str, object], dict[str, object]]:
    payload = read_demo_token(request, token)
    client = request.app.state.supabase or get_supabase(request)
    rows = client.table("payments").select("order_id,amount,currency,status,provider").eq("order_id", str(payload["order"])).eq("provider", "demo_upi").limit(1).execute().data or []
    orders = client.table("orders").select("id,status,payment_status").eq("id", str(payload["order"])).limit(1).execute().data or []
    if not rows or not orders:
        raise HTTPException(status_code=404, detail="Demo payment was not found.")
    if rows[0].get("status") != "pending":
        raise HTTPException(status_code=409, detail="This demo payment has already been processed.")
    return payload, {**rows[0], **orders[0]}


@router.get("/api/payments/demo-qr")
def generate_demo_qr(token: str, request: Request):
    read_demo_token(request, token)
    settings = request.app.state.settings
    target = f"{settings.public_app_url.rstrip('/')}/checkout/pay/{quote(token, safe='')}"
    qr = QRCode(error_correction=1, box_size=8, border=3, image_factory=SvgPathImage)
    qr.add_data(target)
    qr.make(fit=True)
    output = BytesIO()
    qr.make_image().save(output)
    return Response(output.getvalue(), media_type="image/svg+xml", headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


@router.get("/api/payments/demo/{token}")
def get_demo_payment(token: str, request: Request):
    payload, payment = demo_payment_details(request, token)
    return {"amount": payment["amount"], "currency": payment["currency"], "expiresAt": payload["exp"]}


@router.post("/api/payments/demo/{token}/pay")
def pay_demo(token: str, request: Request):
    payload, payment = demo_payment_details(request, token)
    client = request.app.state.supabase or get_supabase(request)
    result = client.rpc("apply_payment_event", {
        "p_provider": "demo_upi", "p_gateway_order_id": str(payment["order_id"]),
        "p_payment_id": f"DEMO-{payload['nonce']}", "p_outcome": "captured",
        "p_amount_minor": round(float(payment["amount"]) * 100), "p_currency": str(payment["currency"]),
        "p_event_id": f"demo-{payload['nonce']}", "p_payload": {"demo": True},
    }).execute()
    order_id = str((result.data or {}).get("order_id", payment["order_id"]))
    orders = client.table("orders").select("id,user_id,customer_email").eq("id", order_id).limit(1).execute().data or []
    if orders and orders[0].get("customer_email"):
        request.app.state.notification_service.emit(client, str(orders[0]["user_id"]), orders[0]["customer_email"], order_id, "order_paid", order_details=True)
    return {"status": "demo_paid", "orderId": order_id, "message": "Demo payment recorded. No money was charged."}
