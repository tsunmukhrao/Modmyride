# ModMyRide Admin ERP Workspace

## Intent
Replace the long single-page admin screen with a usable operations workspace and a visible sign-out action. This is for the store administrator managing catalog, stock, fulfillment, customers, suppliers, transactions, returns, and reporting.

## Goals
- Provide persistent ERP-style navigation to Dashboard, Orders, Products, Categories, Inventory, Customers, Suppliers, Returns, Payments, and Reports.
- Place the signed-in administrator and a working Sign out control in the admin header.
- Preserve existing admin access checks and existing catalog/order/payment/report functions.
- Reuse the existing returns functionality; add a basic supplier register and supplier management workflow backed by persistent data.
- Make dashboard loading/errors visible and keep protected API requests authenticated.

## Non-goals
- Purchasing, receiving, supplier payments, accounting, or automated supplier integrations.
- Changes to customer storefront behavior, payment processing, or database auth roles.
- Exposing service-role credentials to the browser.

## Approaches considered
1. **Navigation shell around existing pages (recommended):** add a persistent sidebar/header and focused sections/pages, reuse existing admin components and APIs, and add a scoped supplier register. This fits the existing app and keeps each operational area focused.
2. **Keep one long page with jump links:** minimal code, but retains the current crowded workflow and makes an ERP panel difficult to navigate.
3. **Adopt a new ERP framework:** broad capability but adds dependencies and risks disrupting current working flows.

## Design
- Shared admin shell with ModMyRide branding, a collapsible/mobile-aware sidebar, active section indication, storefront link, signed-in email, and Sign out button.
- Dashboard summarizes active products, low stock, paid orders, pending fulfillment/returns where supported, and recent orders; show actionable links to operational pages.
- Dedicated navigation destinations for existing catalog, categories, inventory, orders, payments, and reports. Reuse existing handlers/components and data access.
- Customers page lists customer profiles and provides basic search/detail read views only where the current schema/API supports them; do not expose auth secrets.
- Suppliers page provides a persistent supplier register with create/edit/archive and contact/business fields; no purchase-order or supplier-payment workflow in this scope.
- Returns page uses existing return request endpoints and admin actions; include status filtering and clear empty/error states.
- Keep backend authorization on every protected API endpoint. Browser requests use the authenticated Supabase session token. Never rely on UI-only authorization.

## Constraints and acceptance
- Use the existing Next.js, Supabase SSR, and FastAPI architecture; no new UI framework.
- Do not alter Supabase Auth internals or grant broad database privileges.
- Build passes; authenticated admin can open each module; sign out clears the session and returns to storefront; non-admins remain denied.
- Database changes, if required for suppliers, must be additive and documented as a migration. No production database mutation is performed by the implementation.

## Implementation calls left to the builder
- Use the existing dark navy/gold brand palette and current responsive conventions.
- Keep supplier management to a small vendor directory unless the schema reveals an existing richer supplier model.
- Preserve all existing actions and URLs where practical, adding navigation rather than deleting capabilities.
