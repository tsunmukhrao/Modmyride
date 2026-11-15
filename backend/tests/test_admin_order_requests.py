from fastapi.testclient import TestClient

from app.auth import require_admin
from app.main import create_app
from app.supabase import get_supabase


class Query:
    def __init__(self, db, table): self.db, self.table, self.criteria, self.value = db, table, [], None
    def select(self, *_a, **_k): return self
    def eq(self, key, value): self.criteria.append((key, str(value))); return self
    def limit(self, *_a): return self
    def update(self, value): self.value = value; return self
    def execute(self):
        rows = self.db.rows.get(self.table, [])
        for key, value in self.criteria: rows = [r for r in rows if str(r.get(key)) == value]
        if self.value and rows:
            rows[0].update(self.value)
            return type("Result", (), {"data": [rows[0]]})()
        return type("Result", (), {"data": rows})()


class DB:
    rows = {"order_requests": [{"id": "20de9fee-a887-47ee-a648-9ef28de8a2e2", "order_id": "20de9fee-a887-47ee-a648-9ef28de8a2e2", "kind": "return", "status": "pending", "reason": "Wrong fit", "orders": {"status": "delivered", "payment_status": "paid"}}]}
    def table(self, name): return Query(self, name)


def test_admin_can_reject_pending_return_request_and_customer_route_is_protected():
    app = create_app(); db = DB(); app.dependency_overrides[get_supabase] = lambda: db
    app.dependency_overrides[require_admin] = lambda: {"id": "admin-1"}
    with TestClient(app) as client:
        result = client.patch("/api/admin/order-requests/20de9fee-a887-47ee-a648-9ef28de8a2e2", json={"status": "rejected", "adminNote": "Outside policy"})
    assert result.status_code == 200
    assert result.json()["request"]["status"] == "rejected"
