from fastapi.testclient import TestClient

from app.auth import require_admin
from app.main import create_app
from app.supabase import get_supabase


class Query:
    def __init__(self, rows=None):
        self.rows = rows or []
        self.filters = []

    def select(self, *_args, **_kwargs): return self
    def order(self, *_args, **_kwargs): return self
    def range(self, *_args, **_kwargs): return self
    def eq(self, *args): self.filters.append(args); return self
    def gte(self, *args): self.filters.append(args); return self
    def lt(self, *args): self.filters.append(args); return self
    def execute(self): return type("Result", (), {"data": self.rows})()


class Client:
    def __init__(self): self.queries = {}
    def table(self, name):
        query = Query([{"id": "pay-1", "provider": "demo", "provider_reference": "ref", "provider_payment_id": None, "amount": "10", "currency": "INR", "status": "paid", "method": None, "created_at": "2026-11-01T00:00:00Z"}])
        self.queries[name] = query
        return query
    def rpc(self, name, params):
        self.rpc_call = (name, params)
        return type("Query", (), {"execute": lambda _self: type("Result", (), {"data": {"summary": {"orders": 1}, "daily": [], "categories": [], "products": []}})()})()


def test_payment_export_is_admin_only_and_escapes_csv_formula_cells():
    app = create_app()
    app.dependency_overrides[require_admin] = lambda: {"id": "admin-1"}
    client = Client()
    app.dependency_overrides[get_supabase] = lambda: client
    with TestClient(app) as browser:
        response = browser.get("/api/admin/payments/export")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert ",demo," in response.text


def test_report_export_validates_range_and_calls_admin_report_rpc():
    app = create_app()
    app.dependency_overrides[require_admin] = lambda: {"id": "admin-1"}
    client = Client()
    app.dependency_overrides[get_supabase] = lambda: client
    with TestClient(app) as browser:
        invalid = browser.get("/api/admin/reports/export?report=sales&from=2026-11-03&to=2025-01-01")
        valid = browser.get("/api/admin/reports/export?report=sales&from=2026-11-01&to=2026-11-03")
    assert invalid.status_code == 400
    assert valid.status_code == 200
    assert client.rpc_call[0] == "admin_sales_report"
    assert "summary" in valid.text
