import re
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from app.auth import require_admin
from app.supabase import get_supabase

router = APIRouter(prefix="/api/admin/suppliers", tags=["admin"])


class SupplierInput(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    contact_name: str = Field(default="", max_length=160)
    email: str = Field(default="", max_length=254)
    phone: str = Field(default="", max_length=40)
    website: str = Field(default="", max_length=300)
    notes: str = Field(default="", max_length=2000)
    active: bool = True

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        if value and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid supplier email.")
        return value.strip()

    @field_validator("website")
    @classmethod
    def valid_website(cls, value: str) -> str:
        if value and not re.match(r"^https?://[^\s]+$", value, re.IGNORECASE):
            raise ValueError("Website must start with http:// or https://.")
        return value.strip()


def _data(payload: SupplierInput) -> dict[str, Any]:
    return {key: value.strip() if isinstance(value, str) else value for key, value in payload.model_dump().items()}


@router.get("")
def list_suppliers(query: str = Query(default="", max_length=120), _admin=Depends(require_admin), client: Any = Depends(get_supabase)):
    try:
        rows = client.table("suppliers").select("id,name,contact_name,email,phone,website,notes,active,created_at,updated_at").order("name").limit(200).execute().data or []
        needle = query.strip().casefold()
        if needle:
            rows = [row for row in rows if needle in " ".join(str(row.get(key) or "") for key in ("name", "contact_name", "email", "phone")).casefold()]
        return {"suppliers": rows}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Supplier directory is unavailable. Apply the supplier migration and retry.") from exc


@router.post("", status_code=201)
def create_supplier(payload: SupplierInput, _admin=Depends(require_admin), client: Any = Depends(get_supabase)):
    try:
        rows = client.table("suppliers").insert(_data(payload)).execute().data or []
        return {"supplier": rows[0]}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not save supplier. Confirm the supplier migration is applied.") from exc


@router.patch("/{supplier_id}")
def update_supplier(supplier_id: UUID, payload: SupplierInput, _admin=Depends(require_admin), client: Any = Depends(get_supabase)):
    try:
        rows = client.table("suppliers").update(_data(payload)).eq("id", str(supplier_id)).execute().data or []
        if not rows:
            raise HTTPException(status_code=404, detail="Supplier not found.")
        return {"supplier": rows[0]}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not update supplier.") from exc


@router.delete("/{supplier_id}")
def archive_supplier(supplier_id: UUID, _admin=Depends(require_admin), client: Any = Depends(get_supabase)):
    try:
        rows = client.table("suppliers").update({"active": False}).eq("id", str(supplier_id)).execute().data or []
        if not rows:
            raise HTTPException(status_code=404, detail="Supplier not found.")
        return {"supplier": rows[0], "message": "Supplier archived."}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not archive supplier.") from exc
