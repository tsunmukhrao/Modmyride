import csv
import io
import re
from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, model_validator

from app.auth import require_admin
from app.supabase import get_supabase

router = APIRouter(prefix="/api/admin", tags=["admin"])


class ReportRange(BaseModel):
    start: date = Field(alias="from")
    end: date = Field(alias="to")

    @model_validator(mode="after")
    def valid_period(self):
        days = (self.end - self.start).days
        if days < 0:
            raise ValueError("End date must be on or after start date.")
        if days > 365:
            raise ValueError("Choose a date range of one year or less.")
        return self


def _csv_cell(value: Any) -> str:
    text = "" if value is None else str(value)
    if re.match(r"^[\s]*[=+@-]", text):
        text = "'" + text
    return text


def _csv(headers: list[str], rows: list[list[Any]]) -> str:
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow([_csv_cell(item) for item in headers])
    for row in rows:
        writer.writerow([_csv_cell(row[index] if index < len(row) else "") for index in range(len(headers))])
    return output.getvalue()


@router.get("/payments/export")
def export_payments(
    request: Request,
    client: Any = Depends(get_supabase),
    status: Literal["pending", "authorized", "paid", "failed", "partially_refunded", "refunded"] | None = None,
    start: str | None = Query(default=None, alias="from", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end: str | None = Query(default=None, alias="to", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    _admin: dict[str, Any] = Depends(require_admin),
):
    try:
        start_date = date.fromisoformat(start) if start else None
        end_date = date.fromisoformat(end) if end else None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payment date filter.") from exc
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date must be before end date.")
    try:
        query = client.table("payments").select(
            "id,provider,provider_reference,provider_payment_id,amount,currency,status,method,created_at"
        ).order("created_at", desc=True).range(0, 9999)
        if status:
            query = query.eq("status", status)
        if start_date:
            query = query.gte("created_at", f"{start_date.isoformat()}T00:00:00.000Z")
        if end_date:
            query = query.lt("created_at", f"{date.fromordinal(end_date.toordinal() + 1).isoformat()}T00:00:00.000Z")
        rows = query.execute().data or []
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Payment export is unavailable.") from exc
    headers = ["id", "provider", "provider_reference", "provider_payment_id", "amount", "currency", "status", "method", "created_at"]
    content = _csv(headers, [[row.get(key) for key in headers] for row in rows])
    suffix = f"{start}-{end}" if start and end else date.today().isoformat()
    return _csv_response(content, f"modmyride-payments-{suffix}.csv")


@router.get("/reports/export")
def export_report(
    request: Request,
    report: Literal["sales", "feedback"],
    start: date = Query(alias="from"),
    end: date = Query(alias="to"),
    client: Any = Depends(get_supabase),
    _admin: dict[str, Any] = Depends(require_admin),
):
    try:
        checked = ReportRange.model_validate({"from": start, "to": end})
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Choose a valid report and date range.") from exc
    try:
        result = client.rpc(
            "admin_sales_report" if report == "sales" else "admin_feedback_report",
            {"p_from": checked.start.isoformat(), "p_to": checked.end.isoformat()},
        ).execute()
        data = result.data or {}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Report export is unavailable.") from exc
    if report == "sales":
        rows: list[list[Any]] = [["summary", key, value, "", ""] for key, value in (data.get("summary") or {}).items()]
        rows.extend([["daily", row.get("date"), row.get("revenue"), row.get("orders"), ""] for row in data.get("daily", [])])
        rows.extend([["category", row.get("name"), row.get("units"), row.get("revenue"), ""] for row in data.get("categories", [])])
        rows.extend([["product", row.get("name"), row.get("sku"), row.get("units"), row.get("revenue")] for row in data.get("products", [])])
        headers = ["section", "name_or_date", "value_or_units", "orders_or_revenue", "revenue"]
    else:
        rows = [["summary", key, value, "", ""] for key, value in (data.get("summary") or {}).items()]
        rows.extend([["trend", row.get("week"), row.get("average_rating"), row.get("reviews"), ""] for row in data.get("trend", [])])
        rows.extend([["lowest_rated", row.get("product"), row.get("sku"), row.get("average_rating"), row.get("reviews")] for row in data.get("lowest_rated", [])])
        rows.extend([["complaint_theme", row.get("term"), row.get("mentions"), "", ""] for row in data.get("complaint_themes", [])])
        headers = ["section", "name_or_date", "rating_or_mentions", "reviews", "sku_or_reviews"]
    return _csv_response(_csv(headers, rows), f"modmyride-{report}-{start}-to-{end}.csv")


def _csv_response(content: str, filename: str):
    from fastapi.responses import Response

    return Response(content, media_type="text/csv; charset=utf-8", headers={
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-store",
    })
