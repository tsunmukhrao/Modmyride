from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.commerce.shipping import estimate_shipping as calculate_demo_shipping

router = APIRouter(tags=["shipping"])


class EstimateLine(BaseModel):
    productId: UUID
    variantId: UUID | None = None
    quantity: int = Field(ge=1, le=50)


class EstimateRequest(BaseModel):
    postalCode: str = Field(min_length=1, max_length=16)
    items: list[EstimateLine] = Field(min_length=1, max_length=50)


@router.post("/api/shipping/estimate")
def estimate_shipping(payload: EstimateRequest, _user=Depends(get_current_user)):
    try:
        return calculate_demo_shipping(payload.postalCode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
