from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.routes.search import _format_product
from app.supabase import get_supabase

router = APIRouter(prefix="/api/products", tags=["products"])
DETAIL_COLUMNS = (
    "id,sku,name,category_id,brand_id,description,price,compare_at_price,image,tags,in_stock,popularity,created_at,specifications,source_url,"
    "categories(name),brands(name),product_compatibility(vehicles(make,model,year_from,year_to)),"
    "product_specs(name,value,sort_order),product_images(storage_path,alt_text,sort_order),"
    "inventory(quantity,reserved),reviews(rating,status,title,body,created_at)"
)


def _public_storage_url(client: Any, storage_path: str) -> str:
    if storage_path.startswith(("http://", "https://")):
        return storage_path
    try:
        return str(client.storage.from_("product-media").get_public_url(storage_path))
    except Exception:
        return ""


def _detail(row: dict[str, Any], client: Any) -> dict[str, Any]:
    base = _format_product(row)
    image_rows = sorted(row.get("product_images") or [], key=lambda item: int(item.get("sort_order", 0)))
    gallery = [url for item in image_rows if (url := _public_storage_url(client, str(item.get("storage_path", ""))))]
    if not gallery and base["image"]:
        gallery = [base["image"]]
    specifications = dict(row.get("specifications") or {})
    for item in row.get("product_specs") or []:
        if item.get("name"):
            specifications[str(item["name"])] = str(item.get("value", ""))
    reviews = [
        {
            "rating": float(item.get("rating", 0)),
            "title": str(item.get("title", "")),
            "body": str(item.get("body", "")),
            "createdAt": str(item.get("created_at", "")),
        }
        for item in (row.get("reviews") or [])
        if item.get("status") == "approved"
    ]
    return {**base, "image": gallery[0] if gallery else base["image"], "gallery": gallery, "specifications": specifications, "reviews": reviews}


def _get_active_product(client: Any, product_id: str) -> dict[str, Any] | None:
    response = (
        client.table("products")
        .select(DETAIL_COLUMNS)
        .eq("id", product_id)
        .eq("status", "active")
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0] if rows else None


def _format_product_bundles(rows: list[dict[str, Any]], current_product_id: str, current_vehicles: set[str]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        bundle = row.get("product_bundles") or row.get("bundles") or {}
        product = row.get("products") or {}
        bundle_id = str(row.get("bundle_id") or bundle.get("id") or "")
        if not bundle_id or product.get("status") != "active" or product.get("deleted_at"):
            continue
        compat = product.get("product_compatibility") or []
        labels = {f"{(item.get('vehicles') or {}).get('make', '')} {(item.get('vehicles') or {}).get('model', '')}".strip().casefold() for item in compat}
        labels.discard("")
        if labels and current_vehicles and not labels.intersection(current_vehicles):
            continue
        entry = grouped.setdefault(bundle_id, {"id": bundle_id, "title": bundle.get("title", "Vehicle essentials"), "description": bundle.get("description", "Compatible parts, grouped for your build."), "discountPercent": float(bundle.get("discount_percent", 0) or 0), "items": []})
        inventory = product.get("inventory") or []
        inventory = inventory[0] if isinstance(inventory, list) and inventory else inventory if isinstance(inventory, dict) else {}
        variants = [{"id": str(variant.get("id")), "options": variant.get("options") or {}, "price": float(variant.get("price", 0)), "inStock": int(variant.get("quantity", 0)) > int(variant.get("reserved", 0))} for variant in (product.get("product_variants") or []) if variant.get("active")]
        entry["items"].append({"id": str(product.get("id", "")), "name": product.get("name", "Automotive part"), "sku": product.get("sku", ""), "image": product.get("image", ""), "price": float(product.get("price", 0)), "inStock": int(inventory.get("quantity", 0)) > int(inventory.get("reserved", 0)) if inventory else bool(product.get("in_stock", True)), "variants": variants, "quantity": int(row.get("quantity", 1))})
    bundles = []
    for bundle in grouped.values():
        if not any(item["id"] == current_product_id for item in bundle["items"]):
            continue
        subtotal = sum(item["price"] * item["quantity"] for item in bundle["items"])
        discount = round(subtotal * min(max(bundle["discountPercent"], 0), 100) / 100, 2)
        bundle.update({"items": sorted(bundle["items"], key=lambda item: item["name"].casefold()), "subtotal": subtotal, "discount": discount, "total": subtotal - discount})
        bundles.append(bundle)
    return bundles


@router.get("/{product_id}")
def get_product(product_id: str, client: Any = Depends(get_supabase)):
    try:
        row = _get_active_product(client, product_id)
        variants = client.table("product_variants").select("id,sku,options,price,quantity,reserved").eq("product_id", product_id).eq("active", True).order("sku").execute().data or [] if row else []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Product details are temporarily unavailable.") from exc
    if row is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    product = _detail(row, client)
    product["variants"] = [{"id": str(item["id"]), "sku": item["sku"], "options": item.get("options") or {}, "price": float(item["price"]), "inStock": int(item.get("quantity", 0)) > int(item.get("reserved", 0))} for item in variants]
    try:
        member_rows = client.table("bundle_items").select("bundle_id").eq("product_id", product_id).execute().data or []
        bundle_ids = list(dict.fromkeys(str(item["bundle_id"]) for item in member_rows))
        bundle_rows = client.table("bundle_items").select("bundle_id,quantity,product_bundles(id,title,description,discount_percent),products(id,sku,name,price,image,status,deleted_at,in_stock,inventory(quantity,reserved),product_variants(id,options,price,quantity,reserved,active),product_compatibility(vehicles(make,model)))").in_("bundle_id", bundle_ids).execute().data or [] if bundle_ids else []
        vehicle_labels = {f"{(item.get('vehicles') or {}).get('make', '')} {(item.get('vehicles') or {}).get('model', '')}".strip().casefold() for item in row.get("product_compatibility", [])}
        product["bundles"] = _format_product_bundles(bundle_rows, product_id, vehicle_labels)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Product bundles are temporarily unavailable.") from exc
    return {"product": product}


@router.get("/{product_id}/similar")
def get_similar_products(product_id: str, client: Any = Depends(get_supabase)):
    try:
        current_row = _get_active_product(client, product_id)
        if current_row is None:
            raise HTTPException(status_code=404, detail="Product not found.")
        current = _detail(current_row, client)
        query = (
            client.table("products")
            .select(DETAIL_COLUMNS)
            .eq("status", "active")
            .is_("deleted_at", "null")
            .eq("category_id", current_row.get("category_id"))
            .neq("id", product_id)
            .order("popularity", desc=True)
            .limit(100)
            .execute()
        )
        candidates = [_detail(row, client) for row in (query.data or [])]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Recommendations are temporarily unavailable.") from exc

    current_vehicles = {value.lower() for value in current["vehicles"]}
    current_tags = {value.lower() for value in current["tags"]}
    candidates.sort(
        key=lambda item: (
            len(current_vehicles.intersection(value.lower() for value in item["vehicles"])) * 3
            + len(current_tags.intersection(value.lower() for value in item["tags"]))
            + float(item["rating"]),
            item["popularity"],
        ),
        reverse=True,
    )
    return {"category": current["category"], "products": candidates[:4]}
