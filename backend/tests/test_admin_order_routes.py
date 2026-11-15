from fastapi.testclient import TestClient

from app.auth import require_admin
from app.main import create_app


def test_admin_order_update_rejects_invalid_id_and_invalid_transition_fields():
    app = create_app()
    app.dependency_overrides[require_admin] = lambda: {"id": "admin-1"}

    with TestClient(app) as client:
        invalid_id = client.patch("/api/admin/orders/not-an-id", json={"status": "shipped"})
        invalid_status = client.patch("/api/admin/orders/20de9fee-a887-47ee-a648-9ef28de8a2e2", json={"status": "paid"})

    assert invalid_id.status_code == 400
    assert invalid_status.status_code == 400
