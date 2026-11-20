from typing import Any
from email.message import EmailMessage
import smtplib
import ssl

from app.notifications.console import DisabledNotificationProvider
from app.notifications.protocol import NotificationProvider

MESSAGES = {
    "order_placed": ("Order received", "Your order {order_id} was received. Payment and fulfillment status can be checked in your account."),
    "order_paid": ("Payment confirmed", "Payment for order {order_id} has been confirmed."),
    "order_shipped": ("Your order has shipped", "Order {order_id} has shipped. Open your account to view tracking details."),
    "order_delivered": ("Delivery complete", "Order {order_id} is marked delivered. You can review your purchase from your account."),
    "order_cancelled": ("Order cancellation update", "There is an update to the cancellation request for order {order_id}. Check your account for details."),
    "return_request_submitted": ("Return request received", "Your return request for order {order_id} was received for review. No refund has been issued."),
}


def event_message(event_type: str, order_id: str, details: str = "") -> tuple[str, str]:
    template = MESSAGES.get(event_type)
    if not template:
        raise ValueError("Unsupported notification event.")
    return template[0], template[1].format(order_id=order_id) + (f"\n\nOrder details:\n{details}" if details else "")


class SMTPNotificationProvider:
    def __init__(self, host: str, port: int, username: str, password: str, sender: str, sender_name: str):
        self.host, self.port, self.username, self.password = host, port, username, password
        self.sender, self.sender_name = sender, sender_name

    def send(self, to: str, subject: str, body: str, idempotency_key: str):
        from app.notifications.protocol import DeliveryResult
        message = EmailMessage()
        message["From"] = f"{self.sender_name} <{self.sender}>"
        message["To"] = to
        message["Subject"] = subject
        message["X-Idempotency-Key"] = idempotency_key
        message.set_content(body)
        try:
            with smtplib.SMTP(self.host, self.port, timeout=15) as smtp:
                smtp.starttls(context=ssl.create_default_context())
                smtp.login(self.username, self.password)
                smtp.send_message(message)
            return DeliveryResult(delivered=True, message_id=message.get("Message-ID"))
        except Exception:
            return DeliveryResult(delivered=False, error="SMTP delivery failed.")


class NotificationService:
    def __init__(self, provider: NotificationProvider | None = None):
        self.provider = provider or DisabledNotificationProvider()

    def emit(self, client: Any, user_id: str, recipient: str, order_id: str, event_type: str, order_details: bool = False) -> dict[str, str]:
        details = ""
        if order_details:
            try:
                order = (client.table("orders").select("subtotal,discount_total,tax_total,shipping_total,total,currency").eq("id", order_id).limit(1).execute().data or [{}])[0]
                items = client.table("order_items").select("product_snapshot,quantity,unit_price").eq("order_id", order_id).execute().data or []
                lines = [f"- {((item.get('product_snapshot') or {}).get('name') or (item.get('product_snapshot') or {}).get('sku') or 'Product')} × {item.get('quantity')} — {order.get('currency', 'INR')} {item.get('unit_price', 0)} each" for item in items]
                lines += [f"{label}: {order.get(key, 0)}" for label, key in (("Subtotal", "subtotal"), ("Discount", "discount_total"), ("Tax", "tax_total"), ("Shipping", "shipping_total"), ("Total", "total"))]
                details = "\n".join(lines)
            except Exception:
                details = f"Order reference: {order_id}"
        subject, body = event_message(event_type, order_id, details)
        idempotency_key = f"{order_id}:{event_type}"
        try:
            prior = client.table("order_notifications").select("status").eq("idempotency_key", idempotency_key).limit(1).execute().data or []
            if prior and prior[0].get("status") == "sent":
                return {"status": "sent", "message": "Notification already delivered."}
        except Exception:
            pass
        try:
            delivery = self.provider.send(recipient, subject, body, idempotency_key)
            status = "sent" if delivery.delivered else "pending"
            row = {
                "order_id": order_id, "user_id": user_id, "event_type": event_type,
                "subject": subject, "body": body, "status": status,
                "provider_message_id": delivery.message_id,
                "last_error": (delivery.error or "")[:300] or None,
                "idempotency_key": idempotency_key,
            }
            client.table("order_notifications").upsert(row, on_conflict="idempotency_key").execute()
            return {"status": status, "message": "Notification sent." if status == "sent" else "Notification queued for delivery."}
        except Exception:
            # Messaging must never roll back an order, payment, or fulfillment update.
            try:
                client.table("order_notifications").upsert({
                    "order_id": order_id, "user_id": user_id, "event_type": event_type,
                    "subject": subject, "body": body, "status": "pending",
                    "last_error": "Delivery attempt failed; retry required.",
                    "idempotency_key": idempotency_key,
                }, on_conflict="idempotency_key").execute()
            except Exception:
                pass
            return {"status": "pending", "message": "Notification queued for delivery."}
