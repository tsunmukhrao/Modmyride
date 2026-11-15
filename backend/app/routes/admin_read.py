from datetime import date, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import require_admin
from app.supabase import get_supabase

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard")
def get_admin_dashboard(_admin: dict[str, Any] = Depends(require_admin), client: Any = Depends(get_supabase)):
    try:
        products = client.table("products").select("id,sku,name,category_id,brand_id,description,price,compare_at_price,tax_rate,status,tags,specifications,image,deleted_at,inventory(quantity,reserved,low_stock_threshold),product_compatibility(vehicle_id,notes),product_images(id,storage_path,alt_text,sort_order)").order("created_at", desc=True).limit(100).execute().data or []
        orders = client.table("orders").select("id,status,payment_status,total,currency,created_at").order("created_at", desc=True).limit(25).execute().data or []
        categories = client.table("categories").select("id,name,description,parent_id,image_url,active,sort_order").order("sort_order").execute().data or []
        brands = client.table("brands").select("id,name").eq("active", True).order("name").execute().data or []
        vehicles = client.table("vehicles").select("id,make,model,year_from,year_to").order("make").order("model").limit(300).execute().data or []
        for product in products:
            for image in product.get("product_images") or []:
                try:
                    public_url = client.storage.from_("product-media").get_public_url(image["storage_path"])
                    image["url"] = public_url.get("publicUrl", "") if isinstance(public_url, dict) else str(public_url)
                except Exception:
                    image["url"] = ""
        return {"products": products, "orders": orders, "categories": categories, "brands": brands, "vehicles": vehicles}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Admin dashboard data is unavailable.") from exc


@router.get("/payments")
def list_admin_payments(
    status: Literal["pending", "authorized", "paid", "failed", "partially_refunded", "refunded"] | None = None,
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    _admin: dict[str, Any] = Depends(require_admin), client: Any = Depends(get_supabase),
):
    if start and end and start > end:
        raise HTTPException(status_code=400, detail="Start date must be before end date.")
    try:
        query = client.table("payments").select("id,order_id,provider,provider_reference,provider_payment_id,amount,currency,status,method,created_at,refunds(amount,status,reason,created_at)").order("created_at", desc=True).limit(200)
        if status: query = query.eq("status", status)
        if start: query = query.gte("created_at", f"{start.isoformat()}T00:00:00.000Z")
        if end: query = query.lt("created_at", f"{(end + timedelta(days=1)).isoformat()}T00:00:00.000Z")
        rows = query.execute().data or []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Payment data is unavailable.") from exc
    return {"payments": rows}


@router.get("/reports")
def read_admin_reports(
    start: date = Query(alias="from"), end: date = Query(alias="to"),
    _admin: dict[str, Any] = Depends(require_admin), client: Any = Depends(get_supabase),
):
    if end < start or (end - start).days > 365:
        raise HTTPException(status_code=400, detail="Choose a valid date range of one year or less.")
    try:
        sales = client.rpc("admin_sales_report", {"p_from": start.isoformat(), "p_to": end.isoformat()}).execute().data
        feedback = client.rpc("admin_feedback_report", {"p_from": start.isoformat(), "p_to": end.isoformat()}).execute().data
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Report data is unavailable.") from exc
    return {"sales": sales, "feedback": feedback}
