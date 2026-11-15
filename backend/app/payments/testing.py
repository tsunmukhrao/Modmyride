from app.payments.protocol import PaymentEvent, PaymentIntent, PaymentRequest


class FakePaymentAdapter:
    async def create_payment(self, request: PaymentRequest) -> PaymentIntent:
        return PaymentIntent(
            provider="fake",
            reference=f"TEST-{request.order_id}",
            amount_minor=request.amount_minor,
            currency=request.currency.upper(),
            status="created",
            checkout_url="https://payments.invalid/test",
        )

    async def verify_return(self, payload: dict[str, str]) -> bool:
        return payload.get("signature") == "test-signature"

    async def verify_webhook(
        self, raw_body: bytes, signature: str, headers: dict[str, str]
    ) -> PaymentEvent | None:
        if signature != "test-signature":
            return None
        return PaymentEvent(
            event_id=headers.get("x-event-id", "test-event"),
            provider_reference="TEST-order-1",
            transaction_reference="TEST-txn-1",
            outcome="captured",
            amount_minor=12500,
            currency="INR",
            payload={"raw": raw_body.decode("utf-8")},
        )
