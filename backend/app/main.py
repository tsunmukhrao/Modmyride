from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from collections.abc import Mapping
from typing import Any

from app.config import Settings, get_settings
from app.supabase import SupabaseClientFactory, create_supabase_client, get_supabase
from app.routes.search import router as search_router
from app.routes.vehicles import router as vehicles_router
from app.routes.products import router as products_router
from app.routes.customers import router as customers_router
from app.routes.admin_catalog import router as admin_catalog_router
from app.routes.admin_orders import router as admin_orders_router
from app.routes.admin_exports import router as admin_exports_router
from app.routes.admin_images import router as admin_images_router
from app.routes.admin_read import router as admin_read_router
from app.payments.protocol import PaymentAdapter
from app.payments.registry import PaymentRegistry
from app.routes.checkout import router as checkout_router
from app.routes.payments import router as payments_router
from app.routes.shipping import router as shipping_router
from app.routes.invoices import router as invoices_router
from app.routes.returns import admin_router as admin_order_requests_router
from app.routes.returns import router as returns_router
from app.notifications.service import NotificationService


def create_app(
    settings: Settings | None = None,
    supabase_client_factory: SupabaseClientFactory = create_supabase_client,
    payment_adapters: Mapping[str, PaymentAdapter] | None = None,
    notification_service: NotificationService | None = None,
) -> FastAPI:
    configured_settings = settings or get_settings()
    application = FastAPI(title="ModMyRide API", version="0.1.0")
    application.state.settings = configured_settings
    application.state.supabase = None
    application.state.supabase_client_factory = supabase_client_factory
    application.state.payment_registry = PaymentRegistry(payment_adapters)
    application.state.notification_service = notification_service or NotificationService()
    application.include_router(search_router)
    application.include_router(vehicles_router)
    application.include_router(products_router)
    application.include_router(customers_router)
    application.include_router(admin_catalog_router)
    application.include_router(admin_orders_router)
    application.include_router(admin_exports_router)
    application.include_router(admin_images_router)
    application.include_router(admin_read_router)
    application.include_router(checkout_router)
    application.include_router(payments_router)
    application.include_router(shipping_router)
    application.include_router(invoices_router)
    application.include_router(returns_router)
    application.include_router(admin_order_requests_router)

    @application.exception_handler(HTTPException)
    async def http_error_handler(_request, exc: HTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse(status_code=exc.status_code, content={"error": message}, headers=exc.headers)

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(_request, exc: RequestValidationError) -> JSONResponse:
        first_error = exc.errors()[0] if exc.errors() else {}
        return JSONResponse(
            status_code=400,
            content={"error": str(first_error.get("msg", "Invalid request."))},
        )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=configured_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

    @application.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "modmyride-api"}

    return application


app = create_app()
