from app.routes.products import _format_product_bundles


def test_bundle_response_only_includes_active_compatible_members_and_no_fake_discount():
    rows = [{"bundle_id": "eco", "bundles": {"id": "eco", "title": "EcoSport cabin protection", "description": "Matched interior essentials", "discount_percent": 0}, "product_id": "mat", "quantity": 1, "products": {"id": "mat", "name": "Floor mats", "price": 100, "status": "active", "deleted_at": None, "product_compatibility": [{"vehicles": {"make": "Ford", "model": "EcoSport"}}]}}, {"bundle_id": "eco", "bundles": {"id": "eco", "title": "EcoSport cabin protection", "description": "Matched interior essentials", "discount_percent": 0}, "product_id": "filter", "quantity": 2, "products": {"id": "filter", "name": "Cabin filter", "price": 50, "status": "active", "deleted_at": None, "product_compatibility": [{"vehicles": {"make": "Ford", "model": "EcoSport"}}]}}]
    bundles = _format_product_bundles(rows, "mat", {"ford ecosport"})
    assert bundles[0]["total"] == 200
    assert bundles[0]["discount"] == 0
    assert len(bundles[0]["items"]) == 2


def test_bundle_excludes_unavailable_or_incompatible_parts():
    rows = [{"bundle_id": "x", "bundles": {"id": "x", "title": "Kit", "discount_percent": 0}, "product_id": "bad", "quantity": 1, "products": {"id": "bad", "name": "Unavailable", "price": 10, "status": "draft", "deleted_at": None, "product_compatibility": []}}]
    assert _format_product_bundles(rows, "mat", {"ford ecosport"}) == []
