import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user
from app.supabase import get_supabase

router = APIRouter(tags=["invoices"])


@router.get("/api/orders/{order_id}/invoice")
def get_invoice(order_id: str, user: dict[str, Any] = Depends(get_current_user), client: Any = Depends(get_supabase)):
    if not re.fullmatch(r"[0-9a-f-]{36}", order_id, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Invalid order.")
    try:
        rows = client.table("orders").select("id,user_id,status,payment_status,subtotal,discount_total,tax_total,shipping_total,total,currency,shipping,created_at").eq("id", order_id).limit(1).execute().data or []
        if not rows:
            raise HTTPException(status_code=404, detail="Invoice not found.")
        order = rows[0]
        if str(order["user_id"]) != str(user["id"]):
            profiles = client.table("profiles").select("role").eq("id", user["id"]).limit(1).execute().data or []
            if not profiles or profiles[0].get("role") != "admin":
                raise HTTPException(status_code=404, detail="Invoice not found.")
        items = client.table("order_items").select("line_id,product_id,variant_id,quantity,unit_price,product_snapshot").eq("order_id", order_id).execute().data or []
        items = [{"id": item.get("line_id"), **{key: value for key, value in item.items() if key != "line_id"}} for item in items]
        payments = client.table("payments").select("provider,status,amount,currency,provider_payment_id,created_at").eq("order_id", order_id).order("created_at", desc=True).execute().data or []
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Invoice is temporarily unavailable.") from exc
    order.pop("user_id", None)
    return {"invoice": {**order, "items": items, "payments": payments, "isDemoTaxAndShipping": True}}
