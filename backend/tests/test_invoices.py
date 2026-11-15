from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.main import create_app
from app.supabase import get_supabase


class Query:
    def __init__(self, table, rows): self.table, self.rows = table, rows
    def select(self, *_a, **_k): return self
    def eq(self, key, value): self.rows = [row for row in self.rows if str(row.get(key)) == str(value)]; return self
    def limit(self, *_a): return self
    def order(self, *_a, **_k): return self
    def execute(self): return type("Result", (), {"data": self.rows})()


class Client:
    def __init__(self, owner="user-1", order=True):
        self.tables = {
            "orders": [{"id": "20de9fee-a887-47ee-a648-9ef28de8a2e2", "user_id": owner, "subtotal": 100, "tax_total": 10, "shipping_total": 99, "total": 209, "currency": "INR", "shipping": {"recipient": "Demo"}, "created_at": "2026-11-13T00:00:00Z", "status": "confirmed"}] if order else [],
            "order_items": [{"line_id": "line-1", "order_id": "20de9fee-a887-47ee-a648-9ef28de8a2e2", "product_snapshot": {"name": "Ford mat", "sku": "MAT-1"}, "quantity": 1, "unit_price": 100}],
            "payments": [{"provider": "demo", "status": "paid", "amount": 209, "currency": "INR", "created_at": "2026-11-13T00:00:00Z"}],
            "profiles": [{"id": "admin-1", "role": "admin"}],
        }
    def table(self, name): return Query(name, self.tables[name])


def test_invoice_returns_persisted_snapshot_only_for_order_owner():
    app = create_app(); app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}; app.dependency_overrides[get_supabase] = lambda: Client()
    with TestClient(app) as http: response = http.get("/api/orders/20de9fee-a887-47ee-a648-9ef28de8a2e2/invoice")
    assert response.status_code == 200
    assert response.json()["invoice"]["total"] == 209
    assert response.json()["invoice"]["items"][0]["product_snapshot"]["sku"] == "MAT-1"


def test_invoice_denies_other_customer_and_allows_admin():
    app = create_app(); current = {"id": "user-2"}; db = Client()
    app.dependency_overrides[get_current_user] = lambda: current; app.dependency_overrides[get_supabase] = lambda: db
    with TestClient(app) as http:
        denied = http.get("/api/orders/20de9fee-a887-47ee-a648-9ef28de8a2e2/invoice")
        current["id"] = "admin-1"
        allowed = http.get("/api/orders/20de9fee-a887-47ee-a648-9ef28de8a2e2/invoice")
    assert denied.status_code == 404
    assert allowed.status_code == 200


def test_invoice_reports_missing_order():
    app = create_app(); app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}; app.dependency_overrides[get_supabase] = lambda: Client(order=False)
    with TestClient(app) as http: response = http.get("/api/orders/20de9fee-a887-47ee-a648-9ef28de8a2e2/invoice")
    assert response.status_code == 404
