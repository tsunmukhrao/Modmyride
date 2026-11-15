import re
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.auth import require_admin
from app.supabase import get_supabase

router = APIRouter(prefix="/api/account/orders", tags=["order-requests"])
admin_router = APIRouter(prefix="/api/admin/order-requests", tags=["admin"])
RETURN_WINDOW_DAYS = 30


def validate_request_eligibility(kind: str, status: str, delivered_at: datetime | None, now: datetime) -> None:
    if kind == "cancel":
        if status not in {"pending", "confirmed"}:
            raise HTTPException(status_code=409, detail="Cancellation requests are only available before fulfillment.")
        return
    if kind != "return":
        raise HTTPException(status_code=400, detail="Choose cancellation or return.")
    if status != "delivered" or delivered_at is None:
        raise HTTPException(status_code=409, detail="Return requests are available after delivery is recorded.")
    if delivered_at.tzinfo is None:
        delivered_at = delivered_at.replace(tzinfo=timezone.utc)
    if now - delivered_at > timedelta(days=RETURN_WINDOW_DAYS):
        raise HTTPException(status_code=409, detail=f"The {RETURN_WINDOW_DAYS}-day demo return window has ended.")


class OrderRequestInput(BaseModel):
    kind: Literal["cancel", "return"]
    reason: str = Field(min_length=5, max_length=1000)
    itemIds: list[UUID] = Field(default_factory=list, max_length=50)


class OrderRequestReview(BaseModel):
    status: Literal["approved", "rejected"]
    adminNote: str = Field(default="", max_length=1000)


@router.post("/{order_id}/requests", status_code=201)
def create_order_request(order_id: str, payload: OrderRequestInput, request: Request, user: dict[str, Any] = Depends(get_current_user), client: Any = Depends(get_supabase)):
    if not re.fullmatch(r"[0-9a-f-]{36}", order_id, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Invalid order.")
    try:
        rows = client.table("orders").select("id,user_id,status,created_at,customer_email,shipments(delivered_at)").eq("id", order_id).eq("user_id", user["id"]).limit(1).execute().data or []
        if not rows:
            raise HTTPException(status_code=404, detail="Order not found.")
        order = rows[0]
        shipments = order.get("shipments") or []
        shipment = shipments[0] if isinstance(shipments, list) and shipments else shipments if isinstance(shipments, dict) else {}
        delivered = datetime.fromisoformat(shipment["delivered_at"].replace("Z", "+00:00")) if shipment.get("delivered_at") else None
        validate_request_eligibility(payload.kind, order["status"], delivered, datetime.now(timezone.utc))
        if payload.itemIds:
            owned_lines = client.table("order_items").select("line_id").eq("order_id", order_id).execute().data or []
            allowed = {str(line["line_id"]) for line in owned_lines}
            if not {str(item) for item in payload.itemIds}.issubset(allowed):
                raise HTTPException(status_code=400, detail="A selected item is not part of this order.")
        existing = client.table("order_requests").select("id,status").eq("order_id", order_id).eq("kind", payload.kind).in_("status", ["pending", "approved"]).limit(1).execute().data or []
        if existing:
            raise HTTPException(status_code=409, detail="An active request already exists for this order.")
        inserted = client.table("order_requests").insert({"order_id": order_id, "user_id": user["id"], "kind": payload.kind, "reason": payload.reason.strip(), "item_ids": [str(item) for item in payload.itemIds], "status": "pending"}).execute().data or []
    except HTTPException:
        raise
    except Exception as exc:
        if getattr(exc, "code", None) == "23505":
            raise HTTPException(status_code=409, detail="An active request already exists for this order.") from exc
        raise HTTPException(status_code=503, detail="Could not submit your order request.") from exc
    if not inserted:
        raise HTTPException(status_code=503, detail="Could not submit your order request.")
    if order.get("customer_email"):
        request.app.state.notification_service.emit(client, user["id"], order["customer_email"], order_id, "return_request_submitted")
    return {"request": inserted[0], "message": "Request submitted for admin review. Order and payment status have not changed."}


@admin_router.get("")
def list_order_requests(_admin=Depends(require_admin), client: Any = Depends(get_supabase)):
    try:
        rows = client.table("order_requests").select("id,order_id,user_id,kind,reason,status,admin_note,created_at,orders(status,payment_status,total,currency)").eq("status", "pending").order("created_at", desc=True).limit(100).execute().data or []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Order requests are temporarily unavailable.") from exc
    return {"requests": rows}


@admin_router.patch("/{request_id}")
def review_order_request(request_id: str, payload: OrderRequestReview, request: Request, _admin: dict[str, Any] = Depends(require_admin), client: Any = Depends(get_supabase)):
    if not re.fullmatch(r"[0-9a-f-]{36}", request_id, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Invalid order request.")
    try:
        rows = client.table("order_requests").select("id,order_id,user_id,kind,status").eq("id", request_id).eq("status", "pending").limit(1).execute().data or []
        if not rows:
            raise HTTPException(status_code=404, detail="Pending order request not found.")
        order_request = rows[0]
        if payload.status == "approved" and order_request["kind"] == "cancel":
            result = client.rpc("admin_update_order_fulfillment", {"p_order_id": order_request["order_id"], "p_status": "cancelled", "p_courier": None, "p_tracking_number": None, "p_tracking_url": None, "p_eta": None}).execute()
            if getattr(result, "error", None):
                raise HTTPException(status_code=409, detail="Order cannot be cancelled in its current payment or fulfillment state.")
            order_rows = client.table("orders").select("user_id,customer_email").eq("id", order_request["order_id"]).limit(1).execute().data or []
            if order_rows and order_rows[0].get("customer_email"):
                request.app.state.notification_service.emit(client, str(order_rows[0]["user_id"]), order_rows[0]["customer_email"], str(order_request["order_id"]), "order_cancelled")
        updated = client.table("order_requests").update({"status": payload.status, "admin_note": payload.adminNote.strip() or None, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", request_id).eq("status", "pending").execute().data or []
        if not updated:
            raise HTTPException(status_code=409, detail="This request was already reviewed.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not review this order request.") from exc
    return {"request": updated[0], "message": "Request reviewed. Return approvals do not automatically issue a refund."}
