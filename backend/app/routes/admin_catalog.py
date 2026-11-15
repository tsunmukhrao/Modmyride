import re
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, model_validator

from app.auth import require_admin
from app.supabase import get_supabase


def _client(request: Request):
    return request.app.state.supabase or get_supabase(request)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class Compatibility(BaseModel):
    vehicleId: UUID
    notes: str = Field(default="", max_length=300)


class AdminProduct(BaseModel):
    id: UUID | None = None
    sku: str = Field(min_length=3, max_length=60, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._-]*$")
    name: str = Field(min_length=2, max_length=180)
    categoryId: UUID
    brandId: UUID | None
    description: str = Field(max_length=6000)
    price: float = Field(ge=0, le=100_000_000)
    compareAtPrice: float | None
    taxRate: float = Field(ge=0, le=100)
    status: Literal["draft", "active", "archived"]
    quantity: int = Field(ge=0, le=1_000_000)
    lowStockThreshold: int = Field(ge=0, le=1_000_000)
    stockReason: Literal["restock", "correction", "damage", "return", "initial_stock"]
    tags: list[str] = Field(max_length=30)
    specifications: dict[str, str] = Field(max_length=40)
    imageUrl: str = Field(default="", max_length=1000)
    compatibility: list[Compatibility] = Field(max_length=100)

    @model_validator(mode="after")
    def validate_relations_and_price(self):
        if self.compareAtPrice is not None and self.compareAtPrice < self.price:
            raise ValueError("Compare-at price must be at least the current price.")
        ids = [item.vehicleId for item in self.compatibility]
        if len(ids) != len(set(ids)):
            raise ValueError("Each vehicle can only be listed once.")
        if self.imageUrl and not re.match(r"^https?://", self.imageUrl, re.IGNORECASE):
            raise ValueError("Product image must use http or https.")
        return self


class AdminCategory(BaseModel):
    id: UUID | None = None
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=1000)
    parentId: UUID | None = None
    imageUrl: str = Field(default="", max_length=1000)
    active: bool = True
    sortOrder: int = Field(default=0, ge=0, le=100_000)


class ArchiveCategory(BaseModel):
    id: UUID
    reassignTo: UUID | None = None


def _map_database_error(exc: Exception, fallback: str, statuses: tuple[int, ...] = (409,)) -> HTTPException:
    message = str(exc)
    conflict = any(word in message.lower() for word in ("stock", "reserved", "sku", "category", "brand", "vehicle", "fitment", "parent", "cycle", "reassign", "not found", "invalid"))
    return HTTPException(status_code=409 if conflict else 500, detail=message if conflict else fallback)


def _save_product(client: Any, product: AdminProduct, product_id: UUID | None):
    return client.rpc("admin_save_product", {
        "p_product_id": str(product_id) if product_id else None,
        "p_sku": product.sku.strip().upper(),
        "p_name": product.name.strip(),
        "p_category_id": str(product.categoryId),
        "p_brand_id": str(product.brandId) if product.brandId else None,
        "p_description": product.description.strip(),
        "p_price": product.price,
        "p_compare_at_price": product.compareAtPrice,
        "p_tax_rate": product.taxRate,
        "p_status": product.status,
        "p_tags": [tag.strip() for tag in product.tags],
        "p_specifications": product.specifications,
        "p_image": product.imageUrl,
        "p_quantity": product.quantity,
        "p_low_stock_threshold": product.lowStockThreshold,
        "p_stock_reason": product.stockReason,
        "p_compatibility": [item.model_dump(mode="json") for item in product.compatibility],
    }).execute()


@router.post("/products", status_code=201)
def create_product(
    product: AdminProduct,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
):
    if product.id:
        raise HTTPException(status_code=400, detail="Use PATCH to edit an existing product.")
    if int(request.headers.get("content-length", "0") or 0) > 48_000:
        raise HTTPException(status_code=413, detail="Product update is too large.")
    try:
        client = _client(request)
        result = _save_product(client, product, None)
        return {"productId": result.data}
    except Exception as exc:
        raise _map_database_error(exc, "Catalog change could not be saved.") from exc


@router.patch("/products")
def update_product(
    product: AdminProduct,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
):
    if not product.id:
        raise HTTPException(status_code=400, detail="Product ID is required.")
    if int(request.headers.get("content-length", "0") or 0) > 48_000:
        raise HTTPException(status_code=413, detail="Product update is too large.")
    try:
        client = _client(request)
        result = _save_product(client, product, product.id)
        return {"productId": result.data}
    except Exception as exc:
        raise _map_database_error(exc, "Catalog change could not be saved.") from exc


class ArchiveProduct(BaseModel):
    id: UUID


@router.delete("/products")
def archive_product(
    payload: ArchiveProduct,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
):
    try:
        client = _client(request)
        client.rpc("admin_archive_product", {"p_product_id": str(payload.id)}).execute()
    except Exception as exc:
        raise _map_database_error(exc, "Catalog change could not be saved.") from exc
    return {"archived": True}


def _save_category(client: Any, category: AdminCategory, category_id: UUID | None):
    return client.rpc("admin_save_category", {
        "p_category_id": str(category_id) if category_id else None,
        "p_name": category.name.strip(),
        "p_description": category.description.strip(),
        "p_parent_id": str(category.parentId) if category.parentId else None,
        "p_image_url": category.imageUrl,
        "p_active": category.active,
        "p_sort_order": category.sortOrder,
    }).execute()


@router.post("/categories", status_code=201)
def create_category(
    category: AdminCategory,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
):
    if category.id:
        raise HTTPException(status_code=400, detail="Use PATCH to edit a category.")
    if int(request.headers.get("content-length", "0") or 0) > 12_000:
        raise HTTPException(status_code=413, detail="Category update is too large.")
    try:
        client = _client(request)
        result = _save_category(client, category, None)
        return {"categoryId": result.data}
    except Exception as exc:
        raise _map_database_error(exc, "Category change could not be saved.") from exc


@router.patch("/categories")
def update_category(
    category: AdminCategory,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
):
    if not category.id:
        raise HTTPException(status_code=400, detail="Category ID is required.")
    if int(request.headers.get("content-length", "0") or 0) > 12_000:
        raise HTTPException(status_code=413, detail="Category update is too large.")
    try:
        client = _client(request)
        result = _save_category(client, category, category.id)
        return {"categoryId": result.data}
    except Exception as exc:
        raise _map_database_error(exc, "Category change could not be saved.") from exc


@router.delete("/categories")
def archive_category(
    payload: ArchiveCategory,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
):
    try:
        client = _client(request)
        client.rpc("admin_archive_category", {
            "p_category_id": str(payload.id),
            "p_reassign_to": str(payload.reassignTo) if payload.reassignTo else None,
        }).execute()
    except Exception as exc:
        raise _map_database_error(exc, "Category change could not be saved.") from exc
    return {"archived": True}
