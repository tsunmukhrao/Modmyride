# MODMYRIDE

## Hosted admin supplier directory

The ERP admin workspace adds a supplier directory. After deploying this code, apply `supabase/migrations/202611200001_admin_suppliers.sql` once in the hosted Supabase SQL Editor. The migration creates the supplier table and admin-only row policy; until it is applied, the Suppliers page will show a migration-required message. Do not expose the service-role key in the browser.

Next.js App Router storefront and admin workspace with a Python FastAPI backend. The existing PHP project is separate and is not used by this app.

## Local setup

Requirements: Node.js 20+, npm, Python 3.11+, and Docker Desktop (or another Docker-compatible runtime). The Supabase CLI runs a local Postgres, Auth, and Storage stack; no hosted Supabase project is needed for local development. Existing hosted credentials in `.env.local` are preserved. Local settings are generated into ignored `.env.development.local` and take precedence for Next.js and the Python API.

Install packages, start Docker Desktop, then run:

```sh
npm install
npm run local:setup
npm run dev
```

`local:setup` starts Supabase, resets only the local database, applies all migrations and `seed.sql`, writes the local API keys to `.env.development.local`, imports the curated India-market vehicle CSV, and creates the demo customer/admin accounts. It does not connect to the hosted project. Open the storefront at `http://localhost:3000`, and local Supabase Studio at `http://localhost:54323`.

Demo sign-ins:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `driver@modmyride.test` | `DriveLocal!2026` |
| Admin | `admin@modmyride.test` | `AdminLocal!2026` |

These accounts and passwords are for the local demo database only. Do not use them in a deployed environment. Run `npm run local:stop` when finished. Running `supabase db reset` destroys and recreates local data; it does not affect hosted Supabase.

Open `http://localhost:3000`. `npm test`, `npx tsc --noEmit`, and `npm run build` are the current test/type/build checks. The `lint` script needs replacement with an ESLint configuration compatible with the installed Next.js 16 release.

In a second terminal, run the Python API:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

The API health check is `http://localhost:8000/health`. Backend settings load `.env.local` first and then `.env.development.local`, so local services override hosted values during development. The browser calls the Python API through the same-origin Next.js `/api/*` proxy. Local proxy calls use `NEXT_PUBLIC_BACKEND_API_URL`; production uses the private `PYTHON_BACKEND_URL` service address.

## Supabase database

For hosted use, configure these values in `.env.local`. Local development uses generated keys in `.env.development.local` instead:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose it to the browser)
- `NEXT_PUBLIC_SITE_URL` (the local or production origin used in auth emails)

For a hosted project, apply SQL in this order using the Supabase SQL Editor. Local Supabase applies the timestamped migrations automatically on `local:setup`:

1. `supabase/migrations/202611010001_base_schema.sql` — base schema and PostgreSQL full-text search (mirrors `supabase/schema.sql`).
2. `supabase/migrations/202611040001_commerce_search.sql` — additive commerce, access-control, and search schema.
3. `supabase/migrations/202611040002_local_catalog_prerequisites.sql` — catalog references required by product imports.
4. `supabase/migrations/202611050001_admin_reports.sql` — administrator-only sales and customer-feedback report functions.
5. `supabase/migrations/202611060001_customer_payments.sql` — owner-scoped payment/refund reads for transaction history.
6. `supabase/migrations/202611130001_product_variants.sql` — option-aware inventory, cart, and order procedures.
7. `supabase/migrations/202611130002_provider_neutral_payments.sql` — provider-neutral payment events (variant stock aware).
8. `supabase/migrations/202611130003_product_bundles.sql` — curated product sets.
9. `supabase/migrations/202611130004_return_requests.sql` — owner-scoped cancellation/return requests.
10. `supabase/migrations/202611130005_order_notifications.sql` — notification outbox and order email metadata.
11. `supabase/migrations/202611140001_remove_pgvector.sql` — remove prior vector-search tables, triggers, and extension from an already migrated database (deletes stored embeddings).
12. `supabase/migrations/202611140002_import_india_parts.sql` and `202611140003_expand_parts_catalog.sql` — source-linked demo catalog.
13. `supabase/seed.sql` — idempotent demo catalog, variants, vehicle fitment, and bundle.

Back up the database before applying or rolling back SQL. Rollback scripts are in `supabase/rollback/` so the Supabase CLI does not treat them as forward migrations. The newly added store extensions are additive and do not have rollback scripts yet.

In Supabase Auth settings, allow the local and deployed `NEXT_PUBLIC_SITE_URL` callback URLs and configure email confirmation/reset templates to use the callback path `/auth/callback`. Supabase Auth hashes passwords and provides provider-side rate limits; set and review the Auth rate-limit policy in the Supabase dashboard before production use. Role assignment must be performed by a trusted administrator/server process; public registration always creates a `customer` profile.

## Search

Catalog search uses PostgreSQL full-text keyword search with exact SKU, product, and vehicle matching plus category, fitment, price, stock, and rating filters. Both collection vehicle selectors load the curated India-market model list from `data/vehicle-database/india-cars.csv` (Ford listed first). The static storefront catalog now includes 50 more sourced demo listings: 25 universal accessories and 25 vehicle-specific parts. Apply migration `202611140003_expand_parts_catalog.sql` after `202611140002_import_india_parts.sql` to add these SKUs and fitments to Supabase. These are project/demo prices; supplier stock and pricing are not synchronized, images are illustrative, and exact fitment must be confirmed. External source links point to AutoFurnish product/category listings. Replace demo images with supplier-approved licensed photos and verify prices, availability, and fitment before real sales. The vehicle importer uses server-only `SUPABASE_SERVICE_ROLE_KEY`, batches safely, and does not delete existing vehicle rows. Vector embeddings, pgvector tables, and embedding services are not used.

## Payments

Checkout runs through the Python API and a provider-neutral adapter interface. Supabase remains the database, Auth, and storage service. Set `PAYMENT_PROVIDER` only after installing/configuring a matching Python adapter; when no adapter is configured, checkout fails closed before creating an order. Provider credentials stay server-side and webhook signatures/events are validated by the selected adapter. No payment provider is bundled or selected by default.

## Python backend status

The FastAPI service lives in `backend/`. Start it from that directory with `uvicorn app.main:app --reload --port 8000`; set `NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000` for the Next.js proxy. Application data operations are implemented in Python: keyword catalog search, vehicle search/import, product details, cart/orders/reviews, admin catalog/fulfillment/exports, image storage, and payment orchestration. Next.js has only a thin `/api/*` proxy for same-origin browser requests and Supabase cookie-to-bearer session forwarding; it contains no duplicate business/data API handlers. Supabase remains the persistent database/Auth/storage layer.

## Online deployment (Render)

The root `render.yaml` deploys only the FastAPI service in Singapore. In Render, create a Blueprint from this GitHub repository. Render will ask for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; use the same hosted Supabase project as the Vercel frontend. The service-role key belongs only in Render and must never be exposed to browser code. After deployment, copy the API's **public HTTPS URL** (for example, `https://modmyride-api.onrender.com`) and set it as `PYTHON_BACKEND_URL` in the Vercel project's Production (and Preview, if desired) environment variables. Do not use Render's private `hostport` address from Vercel: Vercel is outside Render's private network. Redeploy the Vercel project after changing environment variables.

For Railway, set the API service root directory to `/backend`. The `backend/Dockerfile` installs the FastAPI project and its declared dependencies into Python 3.12, then starts Uvicorn on Railway's `$PORT`. Let Railway detect and use this Dockerfile; clear any custom build and start commands. Set `/health` as the health-check path and add the three Supabase variables to the service.

In Vercel, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the same Supabase project, `NEXT_PUBLIC_SITE_URL` to the Vercel production origin, and `PYTHON_BACKEND_URL` to the public Render API URL. The Next.js same-origin `/api/*` proxy forwards browser requests to that Python API. For local development, use `NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000` instead.

For a fresh hosted Supabase project, review and apply the migrations in the order above (or use the Supabase CLI after linking the correct project and checking its migration history), then run `supabase/seed.sql` once in the SQL Editor to load the demo parts catalog. Import the India vehicle list with `node scripts/import-india-vehicles.mjs` after setting `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your local shell for the intended hosted project. Back up any existing database before applying migrations. In Supabase Auth, set the Site URL to the deployed Vercel origin and allow `https://<your-vercel-domain>/auth/callback` as a redirect URL. Do not create the local demo accounts in production. Configure a real payment adapter and credentials before accepting paid orders; the app intentionally fails closed when no adapter is configured. Product images use the `product-media` Supabase Storage bucket.

`render.yaml` uses `sync: false` for secrets so values are supplied in Render's dashboard and are not stored in the repository. Keep all `.env*` files except `.env.example` out of Git.

## Current API surface

| Method and path | Purpose | Current status |
| --- | --- | --- |
| `GET /api/search?q=&category=&brand=&minPrice=&maxPrice=&rating=&inStock=&make=&model=&year=&sort=&page=` | Full-text keyword catalog search with structured filters and pagination | Implemented against the commerce schema |
| `POST /api/search` | Same search contract as JSON | Implemented |
| `GET /api/products/:id` | Active product details, specs, image gallery, fitment, stock, and approved reviews | Implemented |
| `GET /api/products/:id/similar` | Product-category and vehicle-fitment recommendations for the current item | Implemented; displayed on product details |
| `GET /api/vehicles?q=` | Ranked make/model suggestions from the bundled vehicle CSV | Implemented; keyword matching |
| `POST /api/vehicles/import` | Batch-import makes/models from the bundled vehicle CSV | Admin-only |
| `POST /api/orders` | Authenticated checkout using product IDs, shipping data, and idempotency key | Recalculates totals/checks stock in `place_order`; requires a configured generic payment adapter |
| `POST /api/payments/verify`, `POST /api/webhooks/:provider` | Provider-neutral payment verification/webhook handling | Requires an installed provider adapter |
| `GET /api/orders/:id` | Read own order, status history, and shipment tracking | Authenticated and owner-scoped |
| `PATCH /api/admin/orders/:id` | Advance fulfillment status and set courier/tracking/ETA | Admin-only; transition checks, notification, audit log, and history are committed transactionally |
| `POST /api/admin/products`, `PATCH /api/admin/products`, `DELETE /api/admin/products` | Create, update, and soft-archive catalog products | Admin-only transactional RPC updates price, stock ledger, specs, and fitment |
| `POST /api/admin/categories`, `PATCH /api/admin/categories`, `DELETE /api/admin/categories` | Create/edit category hierarchy, ordering, image URL, visibility; archive with optional product/child reassignment | Admin-only transactional RPC prevents hierarchy cycles and blocks archiving populated categories without reassignment |
| `POST /api/admin/products/:id/images`, `DELETE /api/admin/products/:id/images` | Upload or remove product gallery images | Admin-only; JPEG/PNG/WebP/AVIF signature validation, 6-image gallery cap, and Supabase Storage `product-media` bucket |
| `GET /api/admin/payments/export?from=&to=&status=` | Export payment ledger to CSV | Admin-only, date/status filtered, formula-injection safe, maximum 10,000 rows per export |
| `GET /api/admin/reports/export?report=sales\|feedback&from=&to=` | Export date-filtered sales or customer-feedback report to CSV | Admin-only; server-validated one-year range; spreadsheet-formula safe |
| `GET /admin/reports` | View sales and customer-feedback reports, charts, and exports | Admin-only; requires `202611050001_admin_reports.sql` |
| Customer `/account` | View order history, fulfillment timeline, shipment tracking, payment method/provider/status/reference, and refund status | Signed-in customer; payment/refund reads are owner-scoped by `202611060001_customer_payments.sql` |
| `POST /api/payments/verify` | Verify a configured provider's checkout response | Python backend; authenticated and owner-scoped; callback alone never marks an order paid |
| `POST /api/webhooks/:provider` | Process a configured provider's signed payment events | Python adapter validates raw body/signature; database RPC is idempotent |
| `GET /api/cart`, `PUT /api/cart` | Read/sync the signed-in customer's cart | Uses owner-scoped rows and transactional cart replacement; guest cart remains in browser storage and is merged on login |
| `GET /auth/callback` | Exchange Supabase email confirmation/recovery code for a cookie-backed session | Implemented |

## Implementation status

Completed foundation work so far: the commerce/search schema, sample catalog seed, Supabase auth flows, protected admin rendering, database-backed keyword search/product details, persistent browser cart, collection search suggestions, provider-neutral Python payment contracts, category/fitment recommendations, customer order/review handling, admin catalog/fulfillment, CSV exports, and product image storage. Python backend test coverage includes routes and authorization. The migrations have not been applied against a live database in this workspace, so database, storage, and gateway behavior remain unverified.

Remaining work includes selecting/installing a real gateway adapter, applying and exercising Supabase migrations, plus refunds, invoices/reorder, wishlist/address/coupon/support/notification features, personalization, and full end-to-end commerce coverage. No live Supabase project or payment adapter is configured in this workspace.
