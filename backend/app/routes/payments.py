import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.payments.registry import PaymentConfigurationError
from app.supabase import get_supabase

router = APIRouter(tags=["payments"])


class PaymentVerification(BaseModel):
    provider: str = Field(min_length=1, max_length=60)
    internalOrderId: str
    providerReference: str = Field(min_length=1, max_length=200)
    payload: dict[str, str]


@router.post("/api/payments/verify")
async def verify_payment_return(
    payload: PaymentVerification,
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
):
    if not re.fullmatch(r"[0-9a-f-]{36}", payload.internalOrderId, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Invalid payment response.")
    try:
        provider = request.app.state.payment_registry.get(payload.provider)
    except PaymentConfigurationError as exc:
        raise HTTPException(status_code=503, detail="Payment provider is not configured.") from exc
    try:
        client = request.app.state.supabase or get_supabase(request)
        order_result = client.table("orders").select("id").eq("id", payload.internalOrderId).eq("user_id", user["id"]).limit(1).execute()
        if not (order_result.data or []):
            raise HTTPException(status_code=404, detail="Order not found.")
        payment_result = (
            client.table("payments")
            .select("id")
            .eq("order_id", payload.internalOrderId)
            .eq("provider", payload.provider)
            .eq("provider_reference", payload.providerReference)
            .limit(1)
            .execute()
        )
        if not (payment_result.data or []):
            raise HTTPException(status_code=400, detail="Payment does not belong to this order.")
        valid = await provider.verify_return(payload.payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Payment verification is temporarily unavailable.") from exc
    if not valid:
        raise HTTPException(status_code=401, detail="Payment signature is invalid.")
    return {"valid": True, "paymentStatus": "awaiting_webhook"}


@router.post("/api/webhooks/{provider_name}")
async def receive_payment_webhook(provider_name: str, request: Request):
    try:
        adapter = request.app.state.payment_registry.get(provider_name)
    except PaymentConfigurationError as exc:
        raise HTTPException(status_code=503, detail="Payment provider is not configured.") from exc
    if int(request.headers.get("content-length", "0") or 0) > 1_000_000:
        raise HTTPException(status_code=413, detail="Webhook payload is too large.")
    raw_body = await request.body()
    if len(raw_body) > 1_000_000:
        raise HTTPException(status_code=413, detail="Webhook payload is too large.")
    signature = request.headers.get("x-payment-signature", "")
    try:
        event = await adapter.verify_webhook(raw_body, signature, dict(request.headers))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Payment event could not be verified.") from exc
    if event is None:
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")
    if event.outcome not in {"captured", "failed"} or not event.event_id:
        return {"received": True, "ignored": True}
    try:
        client = request.app.state.supabase or get_supabase(request)
        result = client.rpc("apply_payment_event", {
            "p_provider": provider_name,
            "p_gateway_order_id": event.provider_reference,
            "p_payment_id": event.transaction_reference,
            "p_outcome": event.outcome,
            "p_amount_minor": event.amount_minor,
            "p_currency": event.currency,
            "p_event_id": event.event_id,
            "p_payload": event.payload,
        }).execute()
        if event.outcome == "captured" and isinstance(result.data, dict) and not result.data.get("duplicate"):
            order_id = str(result.data.get("order_id", ""))
            try:
                orders = client.table("orders").select("id,user_id,customer_email").eq("id", order_id).limit(1).execute().data or []
                if orders and orders[0].get("customer_email"):
                    request.app.state.notification_service.emit(client, str(orders[0]["user_id"]), orders[0]["customer_email"], order_id, "order_paid")
            except Exception:
                pass
        return {"received": True, "result": result.data}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Payment event could not be committed.") from exc
