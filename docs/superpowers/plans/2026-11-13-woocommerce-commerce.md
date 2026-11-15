# WooCommerce-style Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the eight selected WooCommerce-style storefront features with server-validated commerce state and responsive presentation.

**Architecture:** Keep Next.js as UI, Python FastAPI as the trusted commerce API, and Supabase as source of truth. Add additive SQL migrations and API contracts first; then wire storefront discovery, option-aware cart and checkout, invoices, post-purchase requests, and replaceable notification delivery. Use browser storage only for recently viewed product history.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Python 3/FastAPI, Supabase PostgreSQL, pytest, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-13-woocommerce-style-commerce-design.md`

## Global Constraints

- “No live carrier, tax calculation service, or email provider credentials are assumed.”
- “Server recalculates variant pricing, stock, and order totals; client-supplied totals are never trusted.”
- “A return request cannot change order/payment state without admin review.”
- “Invoice access is owner/admin protected and renders persisted transaction snapshots.”
- “Demo estimates and invoices must be visibly labeled as sample data where appropriate.”
- “Layouts must remain usable on narrow phones, tablets, and desktop screens.”
- No new external runtime dependency unless an existing project dependency cannot satisfy the behavior.

## Review Focus

1. Client modifies a variant price or submits a mismatched variant/product pair — backend must reject/recalculate; test in variant checkout task.
2. Duplicate or concurrent return request — at most one active request per order/item; test in returns task.
3. Unauthorized invoice/order access — deny non-owner; test in invoice API task.
4. Invalid or unsupported postal code — show no unsupported live-delivery promise; test in shipping estimate task.
5. Missing email settings or provider failure — order flow succeeds, notification remains recorded, and delivery is marked unavailable/retryable; test in notification task.

---

## Task 1: Catalog filters, sorting, and recently viewed foundation

**Files:**
- Modify: `backend/app/routes/search.py`
- Modify: `lib/catalog.ts`
- Modify: `app/collection/page.tsx`
- Create: `lib/catalog-discovery.ts`
- Test: `backend/tests/test_search_routes.py`
- Test: `lib/catalog-discovery.test.ts`

**Interfaces:**
- Produces `CatalogSort = 'relevance' | 'price-asc' | 'price-desc' | 'popular' | 'rating' | 'newest'` and a deterministic local `sortAndFilterProducts(products, filters)` fallback.
- Search request accepts `minPrice`, `maxPrice`, `brand`, `inStock`, `rating` (minimum rating), and `sort` in addition to existing fields.

- [ ] **Step 1: Write failing API and unit tests** for price bounds, brand/stock/rating intersection, stable price sorts, popularity/rating/newest sorts, relevance default, and invalid sort fallback.
- [ ] **Step 2: Run focused tests** with `pytest backend/tests/test_search.py -q` and `npm test -- lib/catalog-discovery.test.ts`; confirm expected missing behavior.
- [ ] **Step 3: Implement search filters/sorts** in Python and matching deterministic local helper; wire filter state to both collection search sections and query string.
- [ ] **Step 4: Add recently viewed utility tests** proving dedupe, newest-first ordering, 12-item cap, and malformed-storage handling; implement client-only storage and a responsive section on home/product pages.
- [ ] **Step 5: Verify** focused tests plus full Python and Vitest suites.

## Task 2: Product option/variant records and variant-safe cart

**Files:**
- Create: `supabase/migrations/202611130001_product_variants.sql`
- Modify: `backend/app/routes/products.py`
- Modify: `backend/app/routes/customers.py`
- Modify: `backend/app/routes/checkout.py`
- Modify: `lib/cart.ts`
- Modify: `components/cart-provider.tsx`
- Modify: `components/product-purchase.tsx`
- Modify: `app/products/[id]/page.tsx`
- Modify: `supabase/migrations.test.ts`
- Create/modify: Python route and cart tests, `lib/cart.test.ts`

**Interfaces:**
- Cart line becomes `{ productId: string; variantId?: string; quantity: number }`.
- Product API returns active variants with stable IDs, option labels, server prices, and availability.
- Checkout accepts product ID + optional variant ID + quantity only; order snapshot stores the chosen labels and unit price.

- [ ] **Step 1: Write failing tests** for normalization/merge of same product with different variants, quantity bounds, invalid variant ownership, server price authority, and stock checks.
- [ ] **Step 2: Run focused tests** and confirm missing schema/API behavior.
- [ ] **Step 3: Add additive variant schema** with option values, SKU, price adjustment/price, inventory reference, active state, uniqueness, and RLS policies.
- [ ] **Step 4: Implement product read and cart sync** preserving old non-variant lines and separating variant cart lines.
- [ ] **Step 5: Implement checkout recomputation and immutable order item snapshots**; reject mismatched or inactive variant IDs.
- [ ] **Step 6: Add product detail option selection** and ensure add-to-cart requires a selection only when product options require it.
- [ ] **Step 7: Run focused API, SQL-contract, and cart tests; then full suites.**

## Task 3: Delivery estimate and tax/total presentation

**Files:**
- Create: `backend/app/commerce/shipping.py`
- Create: `backend/app/routes/shipping.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/routes/checkout.py`
- Modify: `app/checkout/page.tsx`
- Create: `backend/tests/test_shipping.py`
- Modify: `backend/tests/test_checkout.py`

**Interfaces:**
- `POST /api/shipping/estimate` accepts postal code and cart item identifiers, returns demo method, amount, ETA range, and `is_demo: true`.
- Checkout response exposes server-calculated subtotal, discount, tax, shipping, total, and currency.

- [ ] **Step 1: Write failing tests** for six-digit Indian PIN validation, configured demo shipping bands, empty/oversized carts, and exact subtotal/tax/shipping total breakdown.
- [ ] **Step 2: Run `pytest backend/tests/test_shipping.py backend/tests/test_checkout.py -q` and confirm RED.**
- [ ] **Step 3: Implement configurable demo shipping policy** with no carrier availability claims and register the endpoint.
- [ ] **Step 4: Wire postal-code estimate into checkout** with loading/error states and visibly marked demo values; display server tax and total rows.
- [ ] **Step 5: Verify focused and complete backend tests.**

## Task 4: Bundles and compatible product grouping

**Files:**
- Create: `supabase/migrations/202611130002_product_bundles.sql`
- Modify: `backend/app/routes/products.py`
- Modify: `backend/app/routes/search.py`
- Create: `components/product-bundles.tsx`
- Modify: `app/products/[id]/page.tsx`
- Add Python route and SQL migration contract tests.

**Interfaces:**
- Product detail returns curated active bundle groups with component products and server-calculated bundle total; cart additions remain individual product/variant lines.

- [ ] **Step 1: Write failing tests** for active bundle membership, product availability, compatibility, bundle total, and no discount unless explicitly configured.
- [ ] **Step 2: Run focused tests and confirm RED.**
- [ ] **Step 3: Add bundle/group schema and protected admin write policy; expose read-only public bundle API.**
- [ ] **Step 4: Add responsive bundle UI** with individually selectable/addable compatible items.
- [ ] **Step 5: Run focused and full tests.**

## Task 5: Tax invoice presentation and protected order invoice API

**Files:**
- Create: `backend/app/routes/invoices.py`
- Modify: `backend/app/main.py`
- Create: `app/account/orders/[id]/invoice/page.tsx`
- Modify: `app/account/page.tsx`
- Create: `backend/tests/test_invoices.py`
- Add print stylesheet under `app/account/`.

**Interfaces:**
- `GET /api/orders/{order_id}/invoice` returns persisted order, item snapshots, payment status, shipping address, tax and shipping breakdown, with customer-owner/admin authorization.
- Invoice screen provides browser print/save-as-PDF and labels demo tax/shipping context.

- [ ] **Step 1: Write failing tests** for owner success, other-user denial, admin success, snapshot values, and missing order response.
- [ ] **Step 2: Run invoice tests and confirm RED.**
- [ ] **Step 3: Implement owner/admin-protected endpoint** using only persisted order snapshots.
- [ ] **Step 4: Build print-friendly responsive invoice view** with no client-supplied totals.
- [ ] **Step 5: Verify focused and full tests.**

## Task 6: Cancellation and return requests

**Files:**
- Create: `supabase/migrations/202611130003_return_requests.sql`
- Create: `backend/app/routes/returns.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/routes/customers.py`
- Modify: `app/account/page.tsx`
- Create: `backend/tests/test_returns.py`
- Add SQL migration contract tests.

**Interfaces:**
- `POST /api/account/orders/{order_id}/requests` accepts `kind: 'cancel' | 'return'`, bounded reason, and optional eligible item IDs; always starts as `pending`.
- Enforce ownership, eligibility by order lifecycle, delivered-window configuration for returns, and uniqueness of active request.

- [ ] **Step 1: Write failing tests** for cancel-before-fulfillment, cancellation after fulfillment rejection, return inside/outside window, unauthorized order, invalid item, and duplicate active request.
- [ ] **Step 2: Run focused tests and confirm RED.**
- [ ] **Step 3: Implement schema/RLS and service-side eligibility/uniqueness checks**; do not modify order/payment status or create refund.
- [ ] **Step 4: Add account order actions, request history/status, and responsive confirmation UI.**
- [ ] **Step 5: Run focused and complete tests.**

## Task 7: Transactional notification adapter and customer email events

**Files:**
- Create: `backend/app/notifications/protocol.py`
- Create: `backend/app/notifications/console.py`
- Create: `backend/app/notifications/service.py`
- Modify: checkout/payment/order admin transition paths
- Modify: `backend/app/config.py`
- Create: `backend/tests/test_notifications.py`

**Interfaces:**
- `NotificationProvider.send(to: str, subject: str, body: str, idempotency_key: str) -> DeliveryResult`.
- Persist notification rows independently of optional email provider availability; never log access tokens, payment payloads, or full address/card data.

- [ ] **Step 1: Write failing tests** for event-to-message mapping, idempotency, provider success/failure, missing credentials, and order flow not failing on email failure.
- [ ] **Step 2: Run notification tests and confirm RED.**
- [ ] **Step 3: Implement protocol, safe disabled/logging adapter, persistence, and event hooks** for placed/paid/shipped/delivered/cancel/return updates.
- [ ] **Step 4: Add customer in-app notification rendering if the existing account UI has a suitable area; otherwise keep statuses on order records.**
- [ ] **Step 5: Verify full Python tests and inspect logs for PII leakage.**

## Task 8: Responsive UI polish and integrated verification

**Files:**
- Modify: `app/brutalist.css`
- Modify: `app/collection/*`, `app/products/*`, `app/cart/*`, `app/checkout/*`, `app/account/*`
- Create or modify: browser test/viewport QA scripts already present in project, if any.

- [ ] **Step 1: Add regression tests for responsive contracts** (filter panel collapses, product option controls fit narrow width, checkout summary remains reachable, invoice print hides navigation, return form fits mobile).
- [ ] **Step 2: Run tests and capture baseline failures where responsive behavior is absent.**
- [ ] **Step 3: Polish consistent control spacing, hierarchy, loading/empty/error states, and breakpoints** for 360px, 768px, and 1440px. Avoid global redesign beyond touched commerce routes.
- [ ] **Step 4: Run full test suites, `npx tsc --noEmit`, and `npm run build`; perform browser checks with no horizontal overflow at all three widths.**
- [ ] **Step 5: Verify preview links and key customer journey: browse → choose option → bundle/cart → delivery/tax → invoice/account → return request.**
