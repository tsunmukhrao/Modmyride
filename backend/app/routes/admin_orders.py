import re
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator, model_validator

from app.auth import require_admin
from app.supabase import get_supabase

router = APIRouter(prefix="/api/admin/orders", tags=["admin"])


class FulfillmentUpdate(BaseModel):
    status: Literal["confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"]
    courier: str = Field(default="", max_length=120)
    trackingNumber: str = Field(default="", max_length=160)
    trackingUrl: str = Field(default="", max_length=2000)
    eta: str = Field(default="")

    @field_validator("trackingUrl")
    @classmethod
    def validate_tracking_url(cls, value: str) -> str:
        if value and not re.match(r"^https?://[^\s]+$", value, re.IGNORECASE):
            raise ValueError("Tracking URL must use http or https.")
        return value

    @field_validator("eta")
    @classmethod
    def validate_eta(cls, value: str) -> str:
        if value:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value

    @model_validator(mode="after")
    def validate_tracking_number(self):
        if self.status == "shipped" and not self.trackingNumber.strip():
            raise ValueError("A tracking number is required before marking an order shipped.")
        return self


@router.patch("/{order_id}")
def update_order_fulfillment(
    order_id: str,
    payload: FulfillmentUpdate,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
):
    if not re.fullmatch(r"[0-9a-f-]{36}", order_id, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Invalid order.")
    if int(request.headers.get("content-length", "0") or 0) > 8_000:
        raise HTTPException(status_code=413, detail="Update is too large.")
    try:
        client = request.app.state.supabase or get_supabase(request)
        result = client.rpc("admin_update_order_fulfillment", {
            "p_order_id": order_id,
            "p_status": payload.status,
            "p_courier": payload.courier or None,
            "p_tracking_number": payload.trackingNumber or None,
            "p_tracking_url": payload.trackingUrl or None,
            "p_eta": payload.eta or None,
        }).execute()
        event_type = {"shipped": "order_shipped", "delivered": "order_delivered", "cancelled": "order_cancelled"}.get(payload.status)
        if event_type:
            try:
                rows = client.table("orders").select("user_id,customer_email").eq("id", order_id).limit(1).execute().data or []
                if rows and rows[0].get("customer_email"):
                    request.app.state.notification_service.emit(client, str(rows[0]["user_id"]), rows[0]["customer_email"], order_id, event_type)
            except Exception:
                pass
        return {"order": result.data}
    except HTTPException:
        raise
    except Exception as exc:
        message = str(exc)
        conflict = any(word in message.lower() for word in ("transition", "payment", "tracking number", "cancelled", "not found"))
        raise HTTPException(status_code=409 if conflict else 500, detail=message if conflict else "Could not update the order.") from exc
