from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, model_validator

from app.supabase import get_supabase

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchInput(BaseModel):
    query: str = Field(default="", max_length=500)
    category: str | None = Field(default=None, max_length=160)
    brand: str | None = Field(default=None, max_length=160)
    vehicle: str | None = Field(default=None, max_length=160)
    make: str | None = Field(default=None, max_length=160)
    model: str | None = Field(default=None, max_length=160)
    year: int | None = Field(default=None, ge=1886, le=2100)
    minPrice: float | None = Field(default=None, ge=0)
    maxPrice: float | None = Field(default=None, ge=0)
    rating: float | None = Field(default=None, ge=0, le=5)
    inStock: bool | None = None
    sort: Literal["relevance", "price-asc", "price-desc", "popular", "rating", "newest"] = "relevance"
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=24, ge=1, le=100)

    @model_validator(mode="after")
    def validate_price_range(self):
        if self.minPrice is not None and self.maxPrice is not None and self.minPrice > self.maxPrice:
            raise ValueError("Minimum price must not exceed maximum price.")
        return self


def _clean(value: str | None) -> str | None:
    normalized = (value or "").strip()
    return normalized or None


def _vehicle_parts(value: str | None) -> tuple[str | None, str | None]:
    parts = (value or "").strip().split()
    return (parts[0], " ".join(parts[1:])) if len(parts) > 1 else (None, None)


async def _lookup_id(client: Any, table: str, name: str | None) -> str | None:
    if not name:
        return None
    slug = "-".join("".join(char.lower() if char.isalnum() else " " for char in name).split())
    result = client.table(table).select("id").eq("slug", slug).limit(1).execute()
    rows = result.data or []
    if rows:
        return str(rows[0]["id"])
    result = client.table(table).select("id").ilike("name", name).limit(1).execute()
    rows = result.data or []
    return str(rows[0]["id"]) if rows else None


async def _vehicle_product_ids(
    client: Any, make: str | None, model: str | None, year: int | None
) -> list[str] | None:
    if not make:
        return None
    vehicles = client.table("vehicles").select("id,year_from,year_to").ilike("make", make).limit(1000)
    if model:
        vehicles = vehicles.ilike("model", model)
    rows = vehicles.execute().data or []
    matching_ids = [
        str(row["id"])
        for row in rows
        if year is None
        or ((row.get("year_from") is None or int(row["year_from"]) <= year)
            and (row.get("year_to") is None or int(row["year_to"]) >= year))
    ]
    if not matching_ids:
        return []
    relations = (
        client.table("product_compatibility")
        .select("product_id")
        .in_("vehicle_id", matching_ids)
        .limit(10000)
        .execute()
        .data
        or []
    )
    return list(dict.fromkeys(str(item["product_id"]) for item in relations))


def _format_product(row: dict[str, Any]) -> dict[str, Any]:
    category = row.get("categories") or {}
    brand = row.get("brands") or {}
    inventory_rows = row.get("inventory") or []
    inventory = inventory_rows[0] if inventory_rows else {}
    compatibility = row.get("product_compatibility") or []
    vehicles: list[str] = []
    for item in compatibility:
        vehicle = item.get("vehicles") or {}
        make, model = vehicle.get("make"), vehicle.get("model")
        if not make or not model:
            continue
        start, end = vehicle.get("year_from"), vehicle.get("year_to")
        year_label = f" {start}–{end}" if start and end else f" {start}–present" if start else f" up to {end}" if end else ""
        vehicles.append(f"{make} {model}{year_label}")
    reviews = [review for review in row.get("reviews", []) if review.get("status") == "approved"]
    ratings = [float(review["rating"]) for review in reviews if review.get("rating") is not None]
    stock_known = bool(inventory)
    return {
        "id": str(row.get("id", "")),
        "sku": str(row.get("sku", "")),
        "name": str(row.get("name", "")),
        "category": str(category.get("name", "")),
        "price": float(row.get("price", 0)),
        "image": str(row.get("image") or ""),
        "description": str(row.get("description", "")),
        "tags": row.get("tags") or [],
        "vehicles": vehicles,
        "inStock": int(inventory.get("quantity", 0)) > int(inventory.get("reserved", 0)) if stock_known else bool(row.get("in_stock")),
        "brand": str(brand.get("name", "")),
        "rating": sum(ratings) / len(ratings) if ratings else 0,
        "popularity": int(row.get("popularity", 0)),
        "createdAt": str(row.get("created_at", "")),
        "compareAtPrice": float(row["compare_at_price"]) if row.get("compare_at_price") is not None else None,
        "sourceUrl": str(row.get("source_url") or "") or None,
    }


async def _search(input: SearchInput, client: Any) -> dict[str, Any]:
    parsed_make, parsed_model = _vehicle_parts(input.vehicle)
    make, model = _clean(input.make) or parsed_make, _clean(input.model) or parsed_model
    category_id, brand_id, compatible_ids = await _lookup_id(client, "categories", _clean(input.category)), await _lookup_id(client, "brands", _clean(input.brand)), await _vehicle_product_ids(client, make, model, input.year)
    filters = input.model_dump(exclude={"query"})
    filters["category"] = _clean(input.category)
    filters["brand"] = _clean(input.brand)
    if (input.category and not category_id) or (input.brand and not brand_id) or compatible_ids == []:
        return {"products": [], "total": 0, "mode": "database-keyword", "query": input.query, "filters": filters}

    base_query = client.table("products").select(
        "id,sku,name,category_id,brand_id,description,price,compare_at_price,image,tags,in_stock,popularity,created_at,source_url,categories(name),brands(name),product_compatibility(vehicles(make,model,year_from,year_to)),inventory(quantity,reserved),reviews(rating,status)",
        count="exact",
    ).eq("status", "active").is_("deleted_at", "null")
    if category_id:
        base_query = base_query.eq("category_id", category_id)
    if brand_id:
        base_query = base_query.eq("brand_id", brand_id)
    if input.minPrice is not None:
        base_query = base_query.gte("price", input.minPrice)
    if input.maxPrice is not None:
        base_query = base_query.lte("price", input.maxPrice)
    if input.inStock is not None:
        base_query = base_query.eq("in_stock", input.inStock)
    if compatible_ids is not None:
        base_query = base_query.in_("id", compatible_ids)
    if input.query.strip():
        base_query = base_query.text_search("search_vector", input.query.strip(), options={"config": "simple", "type": "websearch"})
    sort_column = {"price-asc": "price", "price-desc": "price", "rating": "popularity", "popular": "popularity", "newest": "created_at"}.get(input.sort, "popularity")
    response = base_query.order(sort_column, desc=input.sort in {"price-desc", "newest"}).limit(1000).execute()
    rows = response.data or []
    products = [_format_product(row) for row in rows]
    total = response.count if response.count is not None else len(products)

    ranked = products
    if input.rating is not None:
        ranked = [product for product in ranked if product["rating"] >= input.rating]
    if input.sort == "price-asc":
        ranked.sort(key=lambda product: product["price"])
    elif input.sort == "price-desc":
        ranked.sort(key=lambda product: product["price"], reverse=True)
    elif input.sort in {"rating", "popular"}:
        key = "rating" if input.sort == "rating" else "popularity"
        ranked.sort(key=lambda product: product[key], reverse=True)
    elif input.sort == "newest":
        ranked.sort(key=lambda product: product["createdAt"], reverse=True)
    start = (input.page - 1) * input.pageSize
    return {
        "products": ranked[start : start + input.pageSize],
        "total": total,
        "mode": "database-keyword",
        "query": input.query,
        "filters": filters,
    }


def _get_input(request: Request) -> SearchInput:
    params = request.query_params
    raw = {
        "query": params.get("q", ""),
        "category": params.get("category"),
        "brand": params.get("brand"),
        "vehicle": params.get("vehicle"),
        "make": params.get("make"),
        "model": params.get("model"),
        "year": params.get("year"),
        "minPrice": params.get("minPrice"),
        "maxPrice": params.get("maxPrice"),
        "rating": params.get("rating"),
        "inStock": params.get("inStock"),
        "sort": params.get("sort", "relevance"),
        "page": params.get("page", 1),
        "pageSize": params.get("pageSize", 24),
    }
    if raw["inStock"] == "":
        raw["inStock"] = None
    return SearchInput.model_validate(raw)


@router.get("")
async def get_search(request: Request, client: Any = Depends(get_supabase)):
    try:
        input = _get_input(request)
        return await _search(input, client)
    except HTTPException:
        raise
    except Exception as exc:
        if isinstance(exc, ValueError):
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        raise HTTPException(status_code=503, detail="Search is temporarily unavailable.") from exc


@router.post("")
async def post_search(input: SearchInput, request: Request, client: Any = Depends(get_supabase)):
    try:
        return await _search(input, client)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Search is temporarily unavailable.") from exc
