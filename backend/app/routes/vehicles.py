import csv
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import require_admin
from app.supabase import get_supabase

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])
VEHICLE_CSV = Path(__file__).resolve().parents[3] / "data" / "vehicle-database" / "india-cars.csv"


def _load_vehicles() -> list[dict[str, Any]]:
    with VEHICLE_CSV.open(newline="", encoding="utf-8") as source:
        records = []
        for row in csv.DictReader(source):
            try:
                year_start = int(row["year_start"])
                year_end = int(row["year_end"]) if row.get("year_end") else None
            except (KeyError, TypeError, ValueError):
                continue
            make, model = row.get("make", "").strip(), row.get("model", "").strip()
            if make and model:
                records.append({"make": make, "model": model, "yearStart": year_start, "yearEnd": year_end, "source": "india-curated"})
        return records


def _rank(vehicles: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
    normalized = query.lower().strip()

    def score(vehicle: dict[str, Any]):
        label = f"{vehicle['make']} {vehicle['model']}".lower()
        rank = 0 if label == normalized else 1 if label.startswith(normalized) else 2 if any(part.startswith(normalized) for part in label.split()) else 3
        priority = 0 if vehicle["make"].casefold() == "ford" else 1
        return rank, priority, len(label), label

    return sorted((vehicle for vehicle in vehicles if not normalized or normalized in f"{vehicle['make']} {vehicle['model']}".lower()), key=score)


@router.get("")
async def search_vehicles(
    q: str = Query(default="", max_length=160),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=80, ge=1),
):
    safe_limit = min(500, limit)
    ordered = _rank(_load_vehicles(), q)
    total = len(ordered)
    page = ordered[offset : offset + safe_limit]
    return {
        "source": "keyword-ranked",
        "count": len(page),
        "totalMatches": len(ordered) if ordered else total,
        "offset": offset,
        "limit": safe_limit,
        "nextOffset": offset + len(page) if offset + len(page) < (len(ordered) if ordered else total) else None,
        "vehicles": page,
    }


@router.post("/import")
def import_vehicles(
    offset: int = 0,
    limit: int = 250,
    _admin: dict[str, Any] = Depends(require_admin),
    client: Any = Depends(get_supabase),
):
    if offset < 0 or not 1 <= limit <= 500:
        raise HTTPException(status_code=400, detail="Invalid offset or limit.")
    records = _load_vehicles()
    batch = records[offset : offset + limit]
    rows = [{
        "source_key": f"{row['make'].lower()}:{row['model'].lower()}:{row['yearStart']}:{row.get('yearEnd') or ''}",
        "make": row["make"], "model": row["model"], "year_from": row["yearStart"],
        "year_to": row.get("yearEnd"), "source": "india-curated",
    } for row in batch]
    try:
        if rows:
            client.table("vehicles").upsert(rows, on_conflict="source_key").execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not import the vehicle batch.") from exc
    next_offset = offset + len(rows)
    return {"status": "imported", "imported": len(rows), "offset": offset, "nextOffset": next_offset if next_offset < len(records) else None, "total": len(records)}
