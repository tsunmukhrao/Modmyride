# WooCommerce-style Store Features — Design

## Intent

Extend MODMYRIDE with the customer-facing commerce features selected by the user while preserving its Next.js storefront, Python API, Supabase data model, and automotive visual identity. Layouts must remain usable on narrow phones, tablets, and desktop screens.

## Selected Scope

1. Rich catalog sorting and filters (price range, popularity, rating, stock, brand, and vehicle).
2. Product variations/options (for example, model year, size, or finish) with selected options preserved in cart and order snapshots.
3. Delivery estimates by postal code.
4. Tax breakdown and print-ready/downloadable invoice presentation.
5. Compatible product bundles.
6. Recently viewed products.
7. Customer cancellation/return requests.
8. Order/payment/shipping email notifications.
9. Responsive layout and interaction QA for all touched pages at mobile, tablet, and desktop widths.

## Current State and Constraints

- Existing product listing supports category, vehicle, and maximum-price filters; sorting and other filter fields are incomplete.
- Product detail pages, cart, checkout, account order history, tracking, reviews, and related products already exist.
- Supabase schema already contains `tax_rate`, order subtotal/discount/tax/shipping fields, product snapshots, notification rows, and support tickets. Product option/variant and return-request entities are not present.
- Python FastAPI is the application backend. Supabase remains the source of truth for products, orders, stock, and customer ownership.
- No live carrier, tax calculation service, or email provider credentials are assumed.
- Existing local Ford catalog products are demo entries; demo estimates and invoices must be visibly labeled as sample data where appropriate.

## Approaches Considered

- **Demo-ready features with replaceable adapters (selected):** implement full UI and server-side flows, using configurable demo delivery rules and existing product tax rates, print-ready invoices, database-backed return requests/notifications, and a provider interface for outbound email. Keeps the app testable without vendor credentials and eases client handoff.
- **Live integrations immediately:** connect an actual carrier, formal tax service, and email provider now. Rejected because the project has no selected providers, credentials, business shipping rules, or verified tax requirements.
- **Frontend-only mock screens:** rejected because cart variants, returns, order totals, and notifications need server-side validation and persistence to be credible.

## Behavioral Design

### Catalog and product discovery

- Add sort choices for relevance, price ascending/descending, popularity, rating, and newest where data exists.
- Add price range, rating, in-stock, brand, and vehicle filters; retain the current category and vehicle controls.
- Filters and sorting are query-string-addressable and compose with search. Empty-result and reset-filter states are provided.
- Recently viewed product IDs are stored locally, deduplicated, newest first, and capped at 12; the section omits the current item and unavailable products.
- Product bundles are curated from explicit product compatibility/association data; every bundle item links to its own detail page and can be added to cart without bypassing stock checks.

### Product options and cart

- Represent a product option configuration as a stable option/variant ID plus selected option labels; price and stock come from the server-owned variant record.
- Cart lines distinguish the same product with different variants. Guest persistence and authenticated cart sync preserve variant IDs.
- Checkout sends product/variant IDs and quantities only; the Python service recomputes prices, stock, tax, and totals.
- Older cart lines without a variant remain valid for products that have no required options.

### Delivery, tax, and invoice

- Postal-code estimate uses a clearly marked configurable demo delivery policy until a carrier adapter is configured. It validates Indian PIN code format and does not claim live carrier availability.
- Checkout displays subtotal, discount (if present), tax, delivery, and total using the server order calculation. Tax uses configured product rates; UI copy states that demo rates are not tax advice.
- A print-friendly invoice view uses persisted order/product snapshots and payment/shipment details. Customers can print or save as PDF from the browser. Invoice is available only to the order owner or admin.

### Post-purchase

- Signed-in customers can request cancellation only before fulfillment begins, or request a return after delivery within a configurable demo window. A request is recorded with reason/items and remains pending admin review; no automatic refund is initiated.
- Order status transitions continue to be controlled by the backend/admin; duplicate requests are prevented or surfaced clearly.
- An email service interface emits order placed, payment status, shipment, delivery, and cancellation/return update messages. Notification rows are persisted; an unconfigured adapter logs a safe non-sensitive event and reports email delivery as disabled. Secrets never reach the frontend.

### Responsive requirements

- At narrow widths, filters become a compact collapsible control area; product cards use one column; checkout fields stack; order tables become cards; dialogs/drawers use full-width or near-full-width layouts with scrollable content and persistent actions.
- At medium and wide widths, existing multi-column layouts remain but avoid fixed viewport assumptions and horizontal overflow.
- All controls remain keyboard reachable, visibly focused, and have accessible labels. Honor reduced-motion preference.

## Non-goals

- Selecting or configuring a real shipping carrier, payment gateway, tax adviser/service, or email vendor.
- Automatically issuing refunds or promising actual delivery dates from demo data.
- Replacing the existing visual theme or rebuilding unrelated pages.

## Acceptance Criteria

- All eight chosen features work through the Python/Supabase-backed flows where state or price is consequential; browser-only storage is limited to recently viewed history.
- Server recalculates variant pricing, stock, and order totals; client-supplied totals are never trusted.
- A return request cannot change order/payment state without admin review.
- Invoice access is owner/admin protected and renders persisted transaction snapshots.
- Missing integration credentials do not break checkout, order history, or local development; unavailable external services are clearly indicated.
- Unit/API tests cover sorting/filter combinations, variant cart/checkout integrity, postal-code validation and delivery estimate copy, invoice ownership, return eligibility, duplicate requests, and notification adapter behavior.
- Responsive checks cover 360px phone, 768px tablet, and 1440px desktop widths, with no horizontal overflow or hidden primary actions.
