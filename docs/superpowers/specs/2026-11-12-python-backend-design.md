# Python Backend Migration Design

## Intent

Move ModMyRide's application API and business logic from Next.js route handlers into a Python service, while retaining the Next.js/React storefront and Supabase-managed PostgreSQL, pgvector, Auth, and Storage. Remove the AI shopping chatbot and AI Studio page. Keep semantic product and vehicle search; it is independent of the conversational assistant. Make checkout use a gateway interface so adding or changing payment providers does not require rewriting order logic.

## Goals

- Python/FastAPI owns API validation, catalog and admin operations, cart/order workflows, search/retrieval, embedding jobs, reports, and payment orchestration.
- Existing storefront behavior and data contracts remain usable during migration; frontend calls the Python API via a configurable API base URL.
- Supabase remains the system of record and identity provider. Browser-side Supabase Auth may handle sign-in/session acquisition; Python verifies access tokens and enforces ownership/admin authorization for every protected operation.
- Semantic/vector search remains, with embedding credentials only on the Python server.
- Payment core depends on a provider protocol; no Razorpay-specific logic is in core order workflows. A production gateway adapter is selected/configured separately.
- Remove assistant route, component, navigation/page, and chatbot-related AI completion configuration.

## Non-goals

- Replacing Supabase or migrating its schema/data.
- Selecting or activating a specific production payment processor in this migration.
- Reworking the visual design of existing non-assistant pages.
- Removing semantic search or vector indexing.

## Approaches

1. **Full FastAPI application backend (selected):** Next.js serves UI; FastAPI owns app APIs and business logic; Supabase stays managed database/auth/storage. This aligns with the request and keeps the existing data platform.
2. **Hybrid Next.js + Python AI service:** keeps commerce/auth/admin APIs in Next.js. Rejected because it does not make Python the full backend.
3. **Replace Supabase with a self-managed Python/PostgreSQL stack:** rejected because the user explicitly wants to keep Supabase and it adds migration risk without benefit here.

## Architecture and boundaries

- Create a Python service under `backend/` using FastAPI, Pydantic, pytest, and the Supabase Python client (or its supported PostgREST/Auth interfaces). Keep route modules grouped by domain.
- Define stable JSON contracts matching the current `/api/*` responses; versioning may be added under `/api` without changing frontend page routes.
- Python verifies Supabase JWTs, obtains user identity/role from trusted Supabase state, and never trusts client-provided user IDs or roles. Service-role credentials remain server-only.
- Keep Supabase browser SDK limited to authentication/session flows. All application data reads/writes go through FastAPI.
- Use a payment protocol for create/verify/refund/webhook operations, provider registry/configuration, and provider-neutral payment records. Provider webhook signature verification is adapter-specific. Until an actual provider is selected/configured, production checkout must fail closed; local tests use a fake adapter.
- Keep indexing and semantic retrieval in Python using Supabase pgvector RPCs. Remove only chat completion/assistant functionality.
- Migrate incrementally: establish Python health/config/client/auth foundations; move read/search APIs; move customer/admin mutations and reports; move checkout/payment webhooks; switch frontend clients and server-rendered data consumers; remove legacy Next.js API routes and chatbot; then verify end-to-end.

## Constraints and risks

- Existing app contains many Next.js API routes and server components that query Supabase directly; all app-data access must be inventoried and redirected, not just browser `fetch('/api/...')` calls.
- Keep existing database authorization/RLS and RPC transaction guarantees; Python must not weaken ownership/admin checks.
- Preserve raw request bodies for payment webhooks and idempotency behavior for order/payment events.
- No configured live Supabase or payment credentials are assumed; integration behavior must be tested with fakes and documented as requiring environment configuration.
- Existing Supabase schema/migrations remain authoritative; do not apply schema changes without need.

## Success criteria

- No app API route contains business logic in Next.js after migration; frontend app-data requests target FastAPI.
- Storefront, fitment, collection search, customer account/cart/orders, admin/catalog/reports, and checkout contracts have Python tests and browser/API smoke coverage.
- The chatbot/AI Studio route and UI are absent; semantic product and vehicle search still pass exact and vector retrieval tests.
- Payment core tests run with a fake provider, unknown provider config is rejected, and webhook verification delegates to the configured adapter.
- Supabase data and auth remain in place and existing project setup docs describe local development for both services.
