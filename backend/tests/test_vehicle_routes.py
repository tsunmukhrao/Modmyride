from fastapi.testclient import TestClient

from app.main import create_app
from app.supabase import get_supabase


def test_vehicle_search_returns_closest_matches_and_pagination_metadata():
    app = create_app()
    app.dependency_overrides[get_supabase] = lambda: None

    with TestClient(app) as client:
        response = client.get("/api/vehicles?q=ford&offset=0&limit=2")

    assert response.status_code == 200
    result = response.json()
    assert result["source"] == "keyword-ranked"
    assert result["count"] == 2
    assert result["totalMatches"] >= 2
    assert result["nextOffset"] == 2
    assert result["vehicles"][0]["make"] == "Ford"
    assert result["vehicles"][0]["make"] == "Ford"


def test_vehicle_database_is_india_focused_and_prioritizes_ford():
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/vehicles?limit=500")

    assert response.status_code == 200
    result = response.json()
    assert result["vehicles"][0]["make"] == "Ford"
    assert {vehicle["make"] for vehicle in result["vehicles"]} <= {
        "Ford", "Maruti Suzuki", "Tata", "Mahindra", "Hyundai", "Honda", "Toyota",
        "Kia", "MG", "Volkswagen", "Skoda", "Renault", "Nissan", "Jeep", "Isuzu",
        "Citroën", "BYD", "BMW", "Mercedes-Benz", "Audi", "Volvo", "Lexus", "Porsche",
        "MINI", "Fiat", "Chevrolet", "Mitsubishi", "Datsun",
    }
    ford_models = {vehicle["model"] for vehicle in result["vehicles"] if vehicle["make"] == "Ford"}
    assert {"EcoSport", "Figo", "Aspire", "Endeavour"} <= ford_models


def test_vehicle_search_caps_limit_and_rejects_negative_offset():
    app = create_app()
    app.dependency_overrides[get_supabase] = lambda: None

    with TestClient(app) as client:
        capped = client.get("/api/vehicles?limit=900")
        invalid = client.get("/api/vehicles?offset=-1")

    assert capped.status_code == 200
    assert capped.json()["limit"] == 500
    assert invalid.status_code == 400


def test_vector_indexing_routes_are_removed():
    app = create_app()
    with TestClient(app) as client:
        product_index = client.post("/api/embeddings/products")
        vehicle_index = client.post("/api/vehicles/index")

    assert product_index.status_code == 404
    assert vehicle_index.status_code == 404
