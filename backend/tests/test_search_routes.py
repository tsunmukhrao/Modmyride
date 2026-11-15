from fastapi.testclient import TestClient

from app.main import create_app
from app.routes import search as search_routes
from app.routes.search import SearchInput
from app.supabase import get_supabase


class NoopSupabase:
    pass


def test_search_rejects_invalid_price_range_with_storefront_error_shape():
    app = create_app()
    app.dependency_overrides[get_supabase] = lambda: NoopSupabase()

    with TestClient(app) as client:
        response = client.post("/api/search", json={"query": "spoiler", "minPrice": 200, "maxPrice": 100})

    assert response.status_code == 400
    assert "error" in response.json()


def test_search_rejects_invalid_boolean_and_page_size():
    app = create_app()
    app.dependency_overrides[get_supabase] = lambda: NoopSupabase()

    with TestClient(app) as client:
        invalid_stock = client.get("/api/search?inStock=sometimes")
        oversized_page = client.get("/api/search?pageSize=101")

    assert invalid_stock.status_code == 400
    assert oversized_page.status_code == 400


def test_valid_search_returns_stable_unavailable_response_when_catalog_fails():
    app = create_app()
    app.dependency_overrides[get_supabase] = lambda: NoopSupabase()

    with TestClient(app) as client:
        response = client.get("/api/search?q=spoiler")

    assert response.status_code == 503
    assert response.json() == {"error": "Search is temporarily unavailable."}


def test_search_uses_keyword_retrieval_without_embedding_or_vector_rpc():
    class Query:
        def select(self, *_args, **_kwargs): return self
        def eq(self, *_args, **_kwargs): return self
        def is_(self, *_args, **_kwargs): return self
        def text_search(self, *_args, **_kwargs): return self
        def order(self, *_args, **_kwargs): return self
        def limit(self, *_args, **_kwargs): return self
        def execute(self):
            return type("Result", (), {"data": [
                {"id": "p1", "name": "Spoiler A", "sku": "A", "price": 10, "search_vector": ""},
                {"id": "p2", "name": "Spoiler B", "sku": "B", "price": 20, "search_vector": ""},
            ], "count": 2})()

    class KeywordClient:
        def table(self, _name): return Query()
        def rpc(self, *_args, **_kwargs): raise AssertionError("keyword search must not call vector RPCs")

    import asyncio
    result = asyncio.run(search_routes._search(search_routes.SearchInput(query="spoiler"), KeywordClient()))

    assert result["mode"] == "database-keyword"
    assert {product["id"] for product in result["products"]} == {"p1", "p2"}
    assert not hasattr(search_routes, "_create_embedding")


def test_search_accepts_popularity_sort_and_minimum_rating_filter():
    parsed = SearchInput.model_validate({"sort": "popular", "rating": 4.5, "minPrice": 100, "maxPrice": 500})

    assert parsed.sort == "popular"
    assert parsed.rating == 4.5
