# ModMyRide Admin ERP Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current admin pages into a navigable ERP-style workspace with working sign-out, customers, suppliers, and returns.

**Architecture:** Add a shared protected App Router layout with client-side navigation and session-aware sign-out. Keep privileged reads and writes in the FastAPI service, authorize each route with `require_admin`, and use the existing same-origin browser API helper so Supabase access tokens reach the backend. Add an additive Supabase migration for a small supplier directory.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase SSR, FastAPI, Supabase Postgres.

**Spec:** `docs/superpowers/specs/2026-11-20-admin-erp-workspace-design.md`

## Global Constraints

- Keep the existing dark navy/gold brand palette and responsive conventions.
- Preserve server-side admin page gating and backend `require_admin` checks.
- Never expose service-role credentials to browser code.
- Supplier scope is a vendor directory only; purchasing and supplier payments are out of scope.
- Do not make direct production database changes; ship an additive migration for user application.
- Do not remove existing catalog, order, payment, report, or return capabilities.

## Review Focus

- Missing or expired browser sessions must show a useful admin error and must never weaken authorization.
- Direct access to admin APIs and pages by a non-admin must remain denied.
- Supplier create/edit/archive must validate and persist without allowing arbitrary fields or unauthenticated access.
- Empty customers, suppliers, returns, and catalog states must render useful empty states.
- Mobile navigation must remain usable and provide access to Sign out.

---

### Task 1: Shared ERP navigation and logout

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `components/admin-shell.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/payments/page.tsx`
- Modify: `app/admin/reports/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- `AdminShell({ email, children }: { email: string; children: React.ReactNode })` provides persistent navigation, active route state, store link, signed-in identity, and the existing `SignOutButton`.
- The server layout calls `requireAdmin()` and passes only the authenticated email to the client shell.

- [ ] Add an admin route layout that enforces `requireAdmin` and wraps child routes in `AdminShell`.
- [ ] Add the sidebar destinations Dashboard, Orders, Products, Categories, Inventory, Customers, Suppliers, Returns, Payments, and Reports; mark current route and support narrow screens.
- [ ] Add `SignOutButton` to the shell header; preserve redirect to storefront and refresh behavior.
- [ ] Remove duplicate admin nav wrappers from existing dashboard, payments, and reports pages while retaining their content and access checks.
- [ ] Add responsive shell and active-navigation styles using existing design tokens.
- [ ] Verify the production build and inspect the resulting changes.

### Task 2: Customers directory API and page

**Files:**
- Modify: `backend/app/routes/admin_read.py`
- Modify: `backend/app/main.py` only if a new router is needed
- Create: `app/admin/customers/page.tsx`
- Create: `components/admin-customers.tsx`

**Interfaces:**
- `GET /api/admin/customers?query=<text>` returns up to 200 admin-visible profile records with ID, name, phone, saved vehicle, and created date; order-derived email is included only where available from existing safe customer data.
- The page uses `backendFetch` and keeps all customer PII behind `require_admin`.

- [ ] Add bounded admin-only customer search over `profiles` using available columns; enrich email only from existing authorized order records, not by querying `auth.users` directly.
- [ ] Render searchable customer rows, saved vehicle and contact fields, with explicit empty/loading/error states.
- [ ] Verify production build and inspect the resulting changes.

### Task 3: Suppliers persistence, API, and page

**Files:**
- Create: `supabase/migrations/202611200001_admin_suppliers.sql`
- Create: `backend/app/routes/admin_suppliers.py`
- Modify: `backend/app/main.py`
- Create: `app/admin/suppliers/page.tsx`
- Create: `components/admin-suppliers.tsx`
- Modify: `.env.example` only if new configuration is genuinely required

**Interfaces:**
- Table `public.suppliers`: UUID ID, required name, optional contact name/email/phone/website/notes, active flag, created/updated timestamps.
- `GET /api/admin/suppliers?query=<text>` lists at most 200 suppliers.
- `POST /api/admin/suppliers` creates a validated supplier.
- `PATCH /api/admin/suppliers/{supplier_id}` updates a validated supplier.
- `DELETE /api/admin/suppliers/{supplier_id}` archives by setting `active=false`; records are not physically deleted.

- [ ] Add the additive supplier table, indexes, RLS policy, and grants needed for the service's guarded access.
- [ ] Add Pydantic request validation and admin-protected list/create/update/archive endpoints.
- [ ] Add supplier directory UI with search, create/edit form, active/archive status, and empty/error/success states.
- [ ] Document the exact migration file in the project deployment instructions so it can be applied to hosted Supabase after push.
- [ ] Verify production build and inspect the resulting changes.

### Task 4: Returns operations page

**Files:**
- Create: `app/admin/returns/page.tsx`
- Create: `components/admin-returns.tsx`
- Modify: `backend/app/routes/returns.py` only if response data needs a safe customer display field

**Interfaces:**
- Reuse `GET /api/admin/order-requests` and `PATCH /api/admin/order-requests/{request_id}`.
- Client requests use `backendFetch`; review actions remain constrained to approved/rejected statuses and current backend validation.

- [ ] Render pending requests with order, customer ID, kind, reason, amount, created date, and review note controls.
- [ ] Add status filter and review action feedback; make clear that approval does not automatically issue a refund.
- [ ] Verify production build and inspect the resulting changes.

### Task 5: Split dashboard into ERP sections and summaries

**Files:**
- Modify: `components/admin-dashboard.tsx`
- Create: `app/admin/orders/page.tsx` and `components/admin-orders.tsx` if needed to provide a focused orders destination.
- Create: `app/admin/products/page.tsx` and `app/admin/categories/page.tsx` if needed to give sidebar destinations real focused pages.
- Create: `app/admin/inventory/page.tsx` if needed to give the stock destination a focused page.

**Interfaces:**
- Keep `GET /api/admin/dashboard` authenticated through `backendFetch`.
- Dashboard links target the focused module pages; catalog, categories, orders, and stock components are reused rather than reimplemented.

- [ ] Turn the dashboard into a concise overview with KPI cards, operational alerts, and recent activity.
- [ ] Add focused module pages or section views for orders, products, categories, and inventory so every sidebar item works.
- [ ] Keep API errors visible and provide loading/empty states.
- [ ] Verify production build and inspect the resulting changes.

### Task 6: Integration review and handoff

**Files:**
- Review all files above and `README.md`.

- [ ] Run `npm run build` and resolve build or type errors.
- [ ] Review the final diff for authorization, PII exposure, broken routes, and responsive navigation.
- [ ] Commit changes and push to `origin/main` as requested.
- [ ] Tell the user which additive Supabase migration to apply and how to verify the deployed admin panel.
