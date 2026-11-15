import logging

from app.notifications.protocol import DeliveryResult

logger = logging.getLogger(__name__)


class DisabledNotificationProvider:
    """Safe default until a transactional email provider is configured."""

    def send(self, to: str, subject: str, body: str, idempotency_key: str) -> DeliveryResult:
        # Avoid logging recipient, message body, addresses, or payment data.
        logger.info("Email delivery disabled; queued notification key=%s", idempotency_key)
        return DeliveryResult(delivered=False, error="Email provider is not configured.")
