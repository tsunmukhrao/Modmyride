import asyncio

import pytest

from app.payments.protocol import PaymentAdapter, PaymentEvent, PaymentIntent, PaymentRequest
from app.payments.registry import PaymentConfigurationError, PaymentRegistry
from app.payments.testing import FakePaymentAdapter


def test_registry_rejects_unconfigured_or_unknown_provider():
    registry = PaymentRegistry({"fake": FakePaymentAdapter()})

    with pytest.raises(PaymentConfigurationError):
        registry.get("")
    with pytest.raises(PaymentConfigurationError):
        registry.get("unknown-gateway")


def test_fake_adapter_obeys_provider_neutral_contract():
    adapter: PaymentAdapter = FakePaymentAdapter()
    request = PaymentRequest(order_id="order-1", amount_minor=12500, currency="INR")

    async def exercise_adapter():
        intent = await adapter.create_payment(request)
        event = await adapter.verify_webhook(
            raw_body=b'{"event":"paid"}', signature="test-signature", headers={}
        )
        return intent, event

    intent, event = asyncio.run(exercise_adapter())

    assert isinstance(intent, PaymentIntent)
    assert intent.amount_minor == 12500
    assert intent.currency == "INR"
    assert isinstance(event, PaymentEvent)
    assert event.outcome == "captured"
