import re
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from app.auth import bearer_scheme, get_current_user, verify_access_token
from app.config import get_settings
from app.supabase import get_supabase

router = APIRouter(tags=["customer"])


class CartLine(BaseModel):
    productId: UUID
    variantId: UUID | None = None
    quantity: int = Field(ge=1, le=50)


class CartSync(BaseModel):
    lines: list[CartLine] = Field(max_length=100)


class ReviewInput(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=2, max_length=100)
    body: str = Field(min_length=10, max_length=3000)


class CustomerProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20)


async def _optional_user(credentials: HTTPAuthorizationCredentials | None, request: Request):
    if credentials is None:
        return None
    try:
        return await verify_access_token(credentials.credentials, request.app.state.settings)
    except HTTPException:
        return None


def _request_supabase(request: Request):
    return request.app.state.supabase or get_supabase(request)


@router.get("/api/auth/me")
def get_identity(request: Request, user: dict[str, Any] = Depends(get_current_user), client: Any = Depends(get_supabase)):
    try:
        rows = client.table("profiles").select("full_name,phone,role,vehicle_make,vehicle_model,vehicle_year").eq("id", user["id"]).limit(1).execute().data or []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not load your profile.") from exc
    profile = rows[0] if rows else {"role": "customer"}
    return {"user": {"id": user["id"], "email": user.get("email", "")}, "profile": profile, "role": "admin" if profile.get("role") == "admin" else "customer"}


@router.put("/api/account/profile")
def update_customer_profile(
    payload: CustomerProfileUpdate,
    user: dict[str, Any] = Depends(get_current_user),
    client: Any = Depends(get_supabase),
):
    full_name = payload.full_name.strip()
    phone = payload.phone.strip()
    if len(full_name) < 2 or not re.fullmatch(r"\+?[1-9]\d{7,14}", phone):
        raise HTTPException(status_code=400, detail="Enter a name and phone number with country code.")
    try:
        result = client.table("profiles").update({"full_name": full_name, "phone": phone}).eq("id", user["id"]).select("id").execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Your profile could not be found.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not save your profile right now.") from exc
    return {"profile": {"full_name": full_name, "phone": phone}}


@router.get("/api/account/orders")
def list_customer_orders(user: dict[str, Any] = Depends(get_current_user), client: Any = Depends(get_supabase)):
    try:
        rows = client.table("orders").select(
            "id,status,payment_status,total,currency,created_at,shipments(courier,tracking_number,tracking_url,eta,shipped_at,delivered_at),payments(provider,provider_payment_id,method,status,amount,currency,created_at,refunds(amount,status,reason)),order_items(line_id),order_status_history(new_status,note,created_at),order_requests(id,kind,status,reason,created_at)"
        ).eq("user_id", user["id"]).order("created_at", desc=True).limit(20).execute().data or []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not load your order history.") from exc
    return {"orders": rows}


@router.get("/api/cart")
async def get_cart(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    user = await _optional_user(credentials, request)
    if user is None:
        return {"authenticated": False, "lines": []}
    try:
        client = _request_supabase(request)
        cart_result = client.table("carts").select("id").eq("user_id", user["id"]).limit(1).execute()
        carts = cart_result.data or []
        if not carts:
            return {"authenticated": True, "lines": []}
        items = client.table("cart_items").select("product_id,variant_id,quantity").eq("cart_id", carts[0]["id"]).order("created_at").execute()
        return {
            "authenticated": True,
            "lines": [{"productId": item["product_id"], "variantId": item.get("variant_id"), "quantity": item["quantity"]} for item in (items.data or [])],
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not load your saved cart.") from exc


@router.put("/api/cart")
async def sync_cart(
    payload: CartSync,
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
):
    if int(request.headers.get("content-length", "0") or 0) > 20_000:
        raise HTTPException(status_code=413, detail="Cart is too large.")
    try:
        client = _request_supabase(request)
        result = client.rpc("sync_customer_cart", {"p_items": [line.model_dump(mode="json") for line in payload.lines]}).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not save your cart.") from exc
    if getattr(result, "error", None):
        message = str(result.error)
        if "unavailable" in message.lower() or "quantity" in message.lower():
            raise HTTPException(status_code=409, detail=message)
        raise HTTPException(status_code=500, detail="Could not save your cart.")
    data = result.data or {}
    lines = data.get("items", []) if isinstance(data, dict) else []
    return {"authenticated": True, "lines": lines}


@router.get("/api/orders/{order_id}")
def get_order_status(
    order_id: str,
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
):
    if not re.fullmatch(r"[0-9a-f-]{36}", order_id, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Invalid order.")
    try:
        client = _request_supabase(request)
        result = (
            client.table("orders")
            .select("id,status,payment_status,total,currency,created_at,order_status_history(old_status,new_status,note,created_at),shipments(courier,tracking_number,tracking_url,eta)")
            .eq("id", order_id)
            .eq("user_id", user["id"])
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not load order status.") from exc
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Order not found.")
    return {"order": rows[0]}


@router.post("/api/products/{product_id}/reviews", status_code=201)
async def submit_review(
    product_id: str,
    payload: ReviewInput,
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
):
    if not re.fullmatch(r"[0-9a-f-]{36}", product_id, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Invalid product.")
    if int(request.headers.get("content-length", "0") or 0) > 12_000:
        raise HTTPException(status_code=413, detail="Review is too large.")
    try:
        client = _request_supabase(request)
        purchase = (
            client.table("order_items")
            .select("order_id,orders!inner(status,user_id)")
            .eq("product_id", product_id)
            .eq("orders.user_id", user["id"])
            .eq("orders.status", "delivered")
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="We could not verify your delivered order.") from exc
    purchases = purchase.data or []
    if not purchases:
        raise HTTPException(status_code=403, detail="A delivered order for this product is required before reviewing.")
    try:
        result = (
            client.table("reviews")
            .insert({
                "product_id": product_id,
                "user_id": user["id"],
                "order_id": purchases[0]["order_id"],
                "rating": payload.rating,
                "title": payload.title,
                "body": payload.body,
                "status": "pending",
            })
            .select("id,status")
            .execute()
        )
    except Exception as exc:
        if getattr(exc, "code", None) == "23505":
            raise HTTPException(status_code=409, detail="You have already reviewed this product.") from exc
        raise HTTPException(status_code=500, detail="We could not save your review.") from exc
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="We could not save your review.")
    return {"review": rows[0], "message": "Review submitted for moderation."}
