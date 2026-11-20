import re
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.payments.protocol import PaymentRequest
from app.payments.registry import PaymentConfigurationError
from app.supabase import get_supabase

router = APIRouter(tags=["payments"])


class CheckoutItem(BaseModel):
    productId: UUID
    variantId: UUID | None = None
    quantity: int = Field(ge=1, le=50)


class ShippingAddress(BaseModel):
    recipient: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=r"^\+?[0-9 ()-]{8,20}$")
    line1: str = Field(min_length=3, max_length=180)
    line2: str = Field(default="", max_length=180)
    city: str = Field(min_length=2, max_length=100)
    region: str = Field(min_length=2, max_length=100)
    postalCode: str = Field(pattern=r"^[1-9][0-9]{5}$")
    countryCode: str = Field(default="IN", min_length=2, max_length=2)


class CheckoutRequest(BaseModel):
    items: list[CheckoutItem] = Field(min_length=1, max_length=50)
    shipping: ShippingAddress
    idempotencyKey: str = Field(min_length=8, max_length=128)
    paymentMethod: Literal["demo_upi", "cash_on_delivery", "gateway"]
    couponCode: str | None = Field(default=None, max_length=64)


@router.post("/api/orders")
async def create_order(
    payload: CheckoutRequest,
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
):
    if int(request.headers.get("content-length", "0") or 0) > 20_000:
        raise HTTPException(status_code=413, detail="Order request is too large.")
    settings = request.app.state.settings
    provider = None
    if payload.paymentMethod == "gateway":
        try:
            provider = request.app.state.payment_registry.get(settings.payment_provider)
        except PaymentConfigurationError as exc:
            raise HTTPException(status_code=503, detail="No payment gateway is configured; no order was created.") from exc

    try:
        client = request.app.state.supabase or get_supabase(request)
        placed = client.rpc("place_order", {
            "p_items": [{"product_id": str(item.productId), "variant_id": str(item.variantId) if item.variantId else None, "quantity": item.quantity} for item in payload.items],
            "p_shipping": payload.shipping.model_dump(by_alias=True),
            "p_idempotency_key": payload.idempotencyKey,
            "p_coupon_code": payload.couponCode,
        }).execute()
        order_info = placed.data or {}
        order_id = str(order_info.get("order_id", ""))
        if not re.fullmatch(r"[0-9a-f-]{36}", order_id, re.IGNORECASE):
            raise HTTPException(status_code=502, detail="The order service returned an invalid response.")
        order_result = client.table("orders").select("id,status,payment_status,total,subtotal,discount_total,tax_total,shipping_total,currency").eq("id", order_id).eq("user_id", user["id"]).limit(1).execute()
        orders = order_result.data or []
        if not orders:
            raise HTTPException(status_code=503, detail="Could not load the placed order.")
        order = orders[0]
        if user.get("email"):
            try:
                client.table("orders").update({"customer_email": user["email"]}).eq("id", order_id).eq("user_id", user["id"]).execute()
            except Exception:
                pass
        if order["status"] != "pending" or order["payment_status"] == "paid":
            raise HTTPException(status_code=409, detail="This order is no longer payable. Review your order history and try checkout again.")
        amount_minor = round(float(order["total"]) * 100)
        if amount_minor < 1:
            raise HTTPException(status_code=409, detail="This order has an invalid payable amount.")
        selected_provider = {"demo_upi": "demo_upi", "cash_on_delivery": "cash_on_delivery"}.get(payload.paymentMethod, settings.payment_provider)
        existing_result = (
            client.table("payments")
            .select("id,provider_reference,amount,currency,status")
            .eq("order_id", order_id)
            .eq("provider", selected_provider)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        existing = existing_result.data or []
        if existing:
            raise HTTPException(status_code=409, detail="A payment attempt is already pending for this order.")
        try:
            demo_token = None
            if payload.paymentMethod == "gateway":
                payment_intent = await provider.create_payment(PaymentRequest(order_id=order_id, amount_minor=amount_minor, currency=str(order["currency"])))
                payment_provider, reference, currency, method = payment_intent.provider, payment_intent.reference, payment_intent.currency, "gateway"
                checkout_url, client_data = payment_intent.checkout_url, payment_intent.client_data or {}
            else:
                from app.routes.demo_qr import create_demo_token
                payment_provider, reference, currency = selected_provider, order_id, str(order["currency"])
                method = "upi_demo" if payload.paymentMethod == "demo_upi" else "cash_on_delivery"
                checkout_url, client_data = None, {}
                if payload.paymentMethod == "demo_upi":
                    demo_token, expires = create_demo_token(request, order_id)
                    client_data = {"demoToken": demo_token, "expiresAt": str(expires)}
            client.table("payments").insert({
                "order_id": order_id, "provider": payment_provider, "provider_reference": reference,
                "idempotency_key": f"{order_id}:{payment_provider}:{reference}", "amount": amount_minor / 100,
                "currency": currency, "status": "pending", "method": method,
            }).execute()
        except Exception as exc:
            try:
                client.rpc("cancel_unpaid_order", {"p_order_id": order_id, "p_reason": "Payment provider setup failed"}).execute()
            except Exception:
                pass
            raise HTTPException(status_code=503, detail="Payment provider is unavailable; reserved stock was released.") from exc
        if order["payment_status"] == "failed":
            client.table("orders").update({"payment_status": "pending"}).eq("id", order_id).eq("payment_status", "failed").execute()
        if user.get("email"):
            request.app.state.notification_service.emit(client, user["id"], user["email"], order_id, "order_placed", order_details=True)
        return {
            "orderId": order_id,
            "payment": {
                "provider": payment_provider,
                "reference": reference,
                "amount": amount_minor,
                "currency": currency,
                "checkoutUrl": checkout_url,
                "clientData": client_data,
            },
            "status": order["payment_status"],
            "summary": {
                "subtotal": float(order.get("subtotal", 0)),
                "discount": float(order.get("discount_total", 0)),
                "tax": float(order.get("tax_total", 0)),
                "shipping": float(order.get("shipping_total", 0)),
                "total": float(order["total"]),
                "currency": str(order["currency"]),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Payment provider is unavailable.") from exc
