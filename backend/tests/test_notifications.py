from app.notifications.protocol import DeliveryResult
from app.notifications.service import NotificationService, event_message


class Provider:
    def __init__(self, result): self.result = result; self.sent = []
    def send(self, to, subject, body, idempotency_key):
        self.sent.append((to, subject, body, idempotency_key)); return self.result


class DB:
    def __init__(self): self.rows = []
    def table(self, _name): return self
    def upsert(self, row, **_kwargs): self.rows.append(row); return self
    def execute(self): return type("Result", (), {"data": []})()


def test_notification_event_message_is_transaction_safe_and_does_not_include_address_or_payment_payload():
    subject, body = event_message("order_paid", "order-123")
    assert subject == "Payment confirmed"
    assert "order-123" in body
    assert "card" not in body.lower()
    assert "address" not in body.lower()


def test_notification_records_provider_success_and_uses_idempotency_key():
    provider = Provider(DeliveryResult(delivered=True, message_id="msg-1")); db = DB()
    service = NotificationService(provider)
    result = service.emit(db, "user-1", "buyer@example.com", "order-1", "order_placed")
    assert result["status"] == "sent"
    assert db.rows[0]["idempotency_key"] == "order-1:order_placed"
    assert provider.sent[0][3] == "order-1:order_placed"


def test_provider_failure_is_persisted_as_retryable_and_returns_without_raising():
    provider = Provider(DeliveryResult(delivered=False, error="provider unavailable")); db = DB()
    result = NotificationService(provider).emit(db, "user-1", "buyer@example.com", "order-1", "order_paid")
    assert result["status"] == "pending"
    assert db.rows[0]["status"] == "pending"
    assert db.rows[0]["last_error"] == "provider unavailable"
