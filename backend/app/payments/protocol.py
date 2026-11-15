from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PaymentRequest:
    order_id: str
    amount_minor: int
    currency: str


@dataclass(frozen=True)
class PaymentIntent:
    provider: str
    reference: str
    amount_minor: int
    currency: str
    status: str
    checkout_url: str | None = None
    client_data: dict[str, str] | None = None


@dataclass(frozen=True)
class PaymentEvent:
    event_id: str
    provider_reference: str
    transaction_reference: str
    outcome: str
    amount_minor: int
    currency: str
    payload: dict[str, object]


class PaymentAdapter(Protocol):
    async def create_payment(self, request: PaymentRequest) -> PaymentIntent: ...

    async def verify_return(self, payload: dict[str, str]) -> bool: ...

    async def verify_webhook(
        self, raw_body: bytes, signature: str, headers: dict[str, str]
    ) -> PaymentEvent | None: ...
