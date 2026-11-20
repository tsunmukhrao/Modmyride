from __future__ import annotations

from io import BytesIO
import re

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from qrcode import QRCode
from qrcode.image.svg import SvgPathImage

router = APIRouter(tags=["demo checkout"])


@router.get("/api/payments/demo-qr")
def generate_demo_qr(
    amount_minor: int = Query(ge=1, le=100_000_000),
    session: str = Query(min_length=8, max_length=64),
):
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", session):
        raise HTTPException(status_code=400, detail="Invalid demo QR session.")
    payload = f"MODMYRIDE DEMO ONLY | NOT A UPI PAYMENT | INR {amount_minor / 100:.2f} | {session}"
    qr = QRCode(error_correction=1, box_size=8, border=3, image_factory=SvgPathImage)
    qr.add_data(payload)
    qr.make(fit=True)
    output = BytesIO()
    qr.make_image().save(output)
    return Response(
        output.getvalue(),
        media_type="image/svg+xml",
        headers={"Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff"},
    )
