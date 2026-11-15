from fastapi.testclient import TestClient

from app.main import create_app
from app.routes.products import _get_active_product, get_product
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


def test_active_product_can_be_resolved_by_sku():
    product = {"id": "8efb1908-1878-4b06-9a1a-5e96491cc601", "sku": "MMR-FORD-001"}

    class ProductQuery(EmptyQuery):
        def __init__(self):
            self.filters = {}

        def eq(self, column, value):
            self.filters[column] = value
            return self

        def execute(self):
            matching = self.filters.get("sku") == product["sku"] or self.filters.get("id") == product["id"]
            return type("Result", (), {"data": [product] if matching else []})()

    class ProductClient:
        def __init__(self):
            self.query = ProductQuery()

        def table(self, _name):
            return self.query

    client = ProductClient()

    assert _get_active_product(client, "MMR-FORD-001") == product
    assert client.query.filters["sku"] == "MMR-FORD-001"


def test_sku_detail_uses_database_id_for_variants_and_bundles():
    product = {
        "id": "8efb1908-1878-4b06-9a1a-5e96491cc601",
        "sku": "MMR-FORD-001",
        "name": "Ford EcoSport Floor Mats",
        "description": "Demo description",
        "price": 3299,
        "categories": {"name": "Interior"},
        "brands": {"name": "Ford"},
    }

    class Query:
        def __init__(self, table, client):
            self.table_name = table
            self.client = client
            self.filters = {}

        def select(self, *_args, **_kwargs):
            return self

        def eq(self, column, value):
            self.filters[column] = value
            if self.table_name == "product_variants" and column == "product_id":
                self.client.variant_product_id = value
            if self.table_name == "bundle_items" and column == "product_id":
                self.client.bundle_product_id = value
            return self

        def is_(self, *_args, **_kwargs):
            return self

        def limit(self, *_args, **_kwargs):
            return self

        def order(self, *_args, **_kwargs):
            return self

        def execute(self):
            if self.table_name == "products" and self.filters.get("sku") == product["sku"]:
                return type("Result", (), {"data": [product]})()
            return type("Result", (), {"data": []})()

    class ProductClient:
        variant_product_id = None
        bundle_product_id = None

        def table(self, name):
            return Query(name, self)

    client = ProductClient()
    result = get_product("MMR-FORD-001", client)

    assert result["product"]["id"] == product["id"]
    assert client.variant_product_id == product["id"]
    assert client.bundle_product_id == product["id"]
