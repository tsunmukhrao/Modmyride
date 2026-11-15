# Python Backend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all ModMyRide application APIs and business logic to FastAPI, remove the shopping chatbot, retain Supabase and semantic search, and make payment processing provider-pluggable.

**Architecture:** Next.js remains the React UI. A Python/FastAPI service owns app-data APIs, authorization, retrieval/indexing, commerce, and payment orchestration; Supabase remains PostgreSQL/pgvector/Auth/Storage. Frontend auth uses Supabase Auth while application data access goes through FastAPI.

**Tech Stack:** Next.js, React, TypeScript, FastAPI, Pydantic, pytest, Supabase PostgreSQL/pgvector/Auth/Storage, provider-neutral payment interface.

**Spec:** `docs/superpowers/specs/2026-11-12-python-backend-design.md`

## Global Constraints

- Preserve existing Supabase schema, data, and user accounts.
- Python owns application API behavior; no application-data reads/writes remain in Next.js server components or route handlers after cutover.
- Keep semantic product/vehicle search and embedding indexing; remove only conversational AI/chatbot features.
- Enforce user ownership and admin permissions server-side; never trust client-supplied identity or role.
- Do not store or log payment card data; fail closed when no production payment adapter is configured.
- Preserve checkout totals, inventory reservation, payment idempotency, signed webhook processing, and existing API response contracts.

## Review Focus

- Invalid/expired Supabase JWT and admin-role spoofing: test authentication and authorization dependencies.
- Cross-user order/cart access: test that all reads and mutations are owner-scoped.
- Duplicate order/payment/webhook requests: test idempotent behavior and database RPC usage.
- Raw-body tampering and unknown gateway configuration: test adapter signature checks and fail-closed startup/config behavior.
- Empty/unavailable vector provider and missing catalog data: test keyword fallback and stable empty responses.

---

### Task 1: Python service foundation and API contracts

**Files:**
- Create: `backend/pyproject.toml`, `backend/app/main.py`, `backend/app/config.py`, `backend/app/supabase.py`, `backend/app/auth.py`, `backend/tests/`
- Modify: `.env.example`, root `README.md`

- [x] Add failing tests for health response, required/optional settings, token validation dependency, and Supabase client injection.
- [x] Add FastAPI app with `/health`, settings-based CORS/API configuration, dependency injection, and test fakes.
- [x] Document Python environment setup and concurrent Next/Python local dev commands.
- [x] Run `cd backend && pytest` and confirm the frontend’s existing test/type/build checks remain green. Python lint remains to run after dev dependencies are installed.

### Task 2: Read-only catalog, vehicle, and semantic search APIs

**Files:**
- Create: `backend/app/routes/search.py`, `backend/app/routes/products.py`, `backend/app/routes/vehicles.py`, `backend/app/services/retrieval.py`, corresponding tests
- Reference: `lib/retrieval.ts`, `app/api/search/route.ts`, `app/api/products/[id]/route.ts`, `app/api/products/[id]/similar/route.ts`, `app/api/vehicles/route.ts`

- [ ] Test query/filter validation, pagination, exact SKU/model search, semantic ranking, vehicle compatibility filtering, and empty/provider-failure fallback.
- [ ] Port matching contracts using Supabase text search and pgvector RPCs; keep embedding provider credentials server-side.
- [ ] Port product details/images/reviews summary and similar-product recommendations.
- [ ] Verify API responses against fixtures from current frontend expectations.

### Task 3: Customer auth-aware cart, profile, orders, and reviews

**Files:**
- Create: `backend/app/routes/cart.py`, `backend/app/routes/orders.py`, `backend/app/routes/reviews.py`, `backend/app/routes/account.py`, domain services and tests
- Reference: `app/api/cart/route.ts`, `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`, `app/api/products/[id]/reviews/route.ts`, `app/account/actions.ts`

- [ ] Test unauthenticated requests, cross-user access denial, cart validation, order ownership, review purchase eligibility, and stable error contracts.
- [ ] Port data operations through Supabase and keep transactional database RPCs for cart/order writes.
- [ ] Keep sign-in/sign-up/session acquisition in Supabase Auth browser SDK; remove server-side Next.js business actions by replacing them with frontend calls to FastAPI/Supabase Auth as appropriate.

### Task 4: Admin catalog, media, fulfillment, and reports

**Files:**
- Create: `backend/app/routes/admin_catalog.py`, `backend/app/routes/admin_orders.py`, `backend/app/routes/admin_reports.py`, schemas/services/tests
- Reference: `app/api/admin/**`, `lib/admin-*-validation.ts`, `lib/report-*.ts`, `lib/payment-csv.ts`

- [ ] Test customer denial/admin approval, product/category validation, image signature/size checks, safe CSV output, and report date limits.
- [ ] Port catalog/category RPC calls, Supabase Storage operations, order fulfillment, audits, and CSV exports.
- [ ] Preserve current transactional RPCs and audit/history behavior.

### Task 5: Provider-neutral checkout and payment webhooks

**Files:**
- Create: `backend/app/payments/protocol.py`, `backend/app/payments/registry.py`, `backend/app/payments/testing.py`, `backend/app/routes/payments.py`, tests
- Modify: `lib/payments.ts`, `lib/razorpay.ts`, `app/checkout/page.tsx`, payment env/docs, payment report mappings as needed
- Reference: `app/api/payments/verify/route.ts`, `app/api/webhooks/razorpay/route.ts`, `app/api/orders/route.ts`

- [ ] Test provider protocol with fake adapter: create intent, verify callback, webhook signature delegation, unsupported provider, retries, and idempotent capture/failure.
- [ ] Move order payment orchestration to Python and make provider selection/configuration adapter-based; do not ship a Razorpay adapter as the default.
- [ ] Keep production checkout disabled until a concrete provider adapter and credentials are configured; document adapter contract and integration steps.
- [ ] Keep card data entirely within the external gateway’s hosted/SDK checkout flow.

### Task 6: Embedding jobs, vehicle indexing/import, and vector maintenance

**Files:**
- Create: `backend/app/routes/embeddings.py`, `backend/app/routes/vehicle_import.py`, indexing services/tests
- Reference: `app/api/embeddings/**`, `app/api/vehicles/import/route.ts`, `app/api/vehicles/index/route.ts`, `scripts/backfill-product-embeddings.mjs`

- [ ] Test internal secret protection, batch bounds, retry/dead-letter behavior, unchanged hash skipping, and vector dimensions.
- [ ] Port product job worker and vehicle import/index flows while retaining Supabase RPC/pgvector schema.
- [ ] Replace the Node indexing script with a Python CLI or document the FastAPI worker invocation.

### Task 7: Frontend API client and complete cutover

**Files:**
- Create: `lib/backend-api.ts` and frontend API tests
- Modify: all frontend `/api/*` fetches, Next server components/data loaders, `next.config.*` if proxying is needed, `.env.example`

- [ ] Test API base URL configuration, session token forwarding, JSON/error parsing, and local/deployed origins.
- [ ] Redirect all app-data requests to FastAPI; resolve server-rendered reads using an explicit server-to-Python call with session token or move those data reads to authenticated client flows.
- [ ] Confirm no Next.js `/api` route or server-only Supabase query remains responsible for application business/data behavior.
- [ ] Run route-by-route smoke tests for collection, fitment, product, account/cart, admin, reports, checkout, and webhooks.

### Task 8: Remove chatbot and obsolete Next.js backend

**Files:**
- Delete: `components/assistant.tsx`, `app/ai-studio/page.tsx`, `app/api/assistant/route.ts`
- Modify: `app/page.tsx`, `components/site-header.tsx`, home/navigation styling/copy, `.env.example`, README
- Delete: migrated `app/api/**` handlers only after each route has passed cutover verification

- [ ] Test navigation does not expose AI Studio and no assistant/chat endpoint remains.
- [ ] Remove chatbot section/link and chat-completion settings while retaining embedding/vector search configuration.
- [ ] Remove superseded Next route handlers after confirming equivalent Python endpoints and frontend cutover.

### Task 9: Full verification and migration handoff

**Files:**
- Modify: `README.md`, local development/env docs, deployment notes
- Test: Python tests, frontend tests, TypeScript, production frontend build, API smoke tests

- [ ] Run `cd backend && pytest`, lint/type checks, `npm test`, `npx tsc --noEmit`, and `npm run build`.
- [ ] Verify setup documentation includes Supabase config, Python API startup, frontend API URL, embedding config, and provider adapter configuration.
- [ ] Record any checks requiring live Supabase/payment credentials as unverified rather than claiming success.
