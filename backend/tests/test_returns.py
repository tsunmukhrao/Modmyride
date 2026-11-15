from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.main import create_app
from app.routes.returns import validate_request_eligibility
from app.supabase import get_supabase


def test_request_eligibility_respects_order_lifecycle_and_return_window():
    assert validate_request_eligibility("cancel", "confirmed", None, datetime.now(timezone.utc)) is None
    with pytest.raises(HTTPException) as error:
        validate_request_eligibility("cancel", "shipped", None, datetime.now(timezone.utc))
    assert error.value.status_code == 409
    delivered = datetime.now(timezone.utc) - timedelta(days=10)
    assert validate_request_eligibility("return", "delivered", delivered, datetime.now(timezone.utc)) is None
    with pytest.raises(HTTPException) as expired:
        validate_request_eligibility("return", "delivered", datetime.now(timezone.utc) - timedelta(days=31), datetime.now(timezone.utc))
    assert expired.value.status_code == 409


class Query:
    def __init__(self, table, db): self.table, self.db, self.criteria = table, db, []
    def select(self, *_a, **_k): return self
    def eq(self, key, value): self.criteria.append((key, str(value))); return self
    def in_(self, key, values): self.criteria.append((key, "|".join(values))); return self
    def limit(self, *_a): return self
    def insert(self, value): self.db.inserted.append(value); return self
    def execute(self):
        if self.table == "order_requests" and self.db.duplicate and not self.db.inserted: return type("Result", (), {"data": [{"id": "existing", "status": "pending"}]})()
        rows = self.db.tables.get(self.table, [])
        for key, value in self.criteria: rows = [row for row in rows if str(row.get(key)) == value or (key == "status" and str(row.get(key)) in value.split("|"))]
        if self.db.inserted: return type("Result", (), {"data": [{"id": "request-1", **self.db.inserted[-1]}]})()
        return type("Result", (), {"data": rows})()


class DB:
    duplicate = False
    inserted = []
    tables = {"orders": [{"id": "20de9fee-a887-47ee-a648-9ef28de8a2e2", "user_id": "user-1", "status": "confirmed", "created_at": datetime.now(timezone.utc).isoformat(), "shipments": []}]}
    def table(self, name): return Query(name, self)


def test_customer_can_request_cancellation_but_duplicate_active_request_is_conflict():
    app = create_app(); db = DB(); db.inserted = []; db.duplicate = False
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}; app.dependency_overrides[get_supabase] = lambda: db
    payload = {"kind": "cancel", "reason": "Changed my mind"}
    with TestClient(app) as client:
        created = client.post("/api/account/orders/20de9fee-a887-47ee-a648-9ef28de8a2e2/requests", json=payload)
        db.duplicate = True
        duplicate = client.post("/api/account/orders/20de9fee-a887-47ee-a648-9ef28de8a2e2/requests", json=payload)
    assert created.status_code == 201
    assert created.json()["request"]["status"] == "pending"
    assert duplicate.status_code == 409
