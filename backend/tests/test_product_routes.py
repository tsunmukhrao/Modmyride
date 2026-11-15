from fastapi.testclient import TestClient

from app.main import create_app
from app.supabase import get_supabase


class EmptyQuery:
    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def is_(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        return type("Result", (), {"data": []})()


class EmptySupabase:
    def table(self, _name):
        return EmptyQuery()


def test_missing_product_returns_404_for_detail_and_related_routes():
    app = create_app()
    app.dependency_overrides[get_supabase] = lambda: EmptySupabase()

    with TestClient(app) as client:
        detail = client.get("/api/products/missing-product")
        related = client.get("/api/products/missing-product/similar")

    assert detail.status_code == 404
    assert detail.json() == {"error": "Product not found."}
    assert related.status_code == 404
    assert related.json() == {"error": "Product not found."}
