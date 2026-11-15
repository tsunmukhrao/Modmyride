from collections.abc import Mapping

from app.payments.protocol import PaymentAdapter


class PaymentConfigurationError(RuntimeError):
    pass


class PaymentRegistry:
    def __init__(self, adapters: Mapping[str, PaymentAdapter] | None = None) -> None:
        self._adapters = {name.strip().lower(): adapter for name, adapter in (adapters or {}).items()}

    def get(self, provider: str | None) -> PaymentAdapter:
        normalized = (provider or "").strip().lower()
        if not normalized:
            raise PaymentConfigurationError("No payment provider is configured.")
        adapter = self._adapters.get(normalized)
        if adapter is None:
            raise PaymentConfigurationError(f"Payment provider '{normalized}' is not installed.")
        return adapter
