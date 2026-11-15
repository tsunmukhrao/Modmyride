from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class DeliveryResult:
    delivered: bool
    message_id: str | None = None
    error: str | None = None


class NotificationProvider(Protocol):
    def send(self, to: str, subject: str, body: str, idempotency_key: str) -> DeliveryResult: ...
