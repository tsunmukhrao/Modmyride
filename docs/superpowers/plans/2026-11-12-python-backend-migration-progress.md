# Execution ledger — `docs/superpowers/plans/2026-11-12-python-backend-migration.md`

## Setup

- Approved by user on 2026-11-13.
- Spec read: `docs/superpowers/specs/2026-11-12-python-backend-design.md`.
- Pre-flight: task dependencies are sequential through backend foundation → domain endpoints → frontend cutover; payment and vector workflows depend on the foundation client/auth/config contracts.
- Ruling: the supplied workspace has no `.git` repository and is not a registered git checkout, so an isolated git worktree and commit-based task ledger are unavailable. Work is being made only inside the user-authorized project directory; preserve user files and record verified task state here.
- Ruling: `ruff` is not installed in the local Python environment and no package installation was attempted under restricted network access. `ruff` will be included in the project dev dependencies and lint run is deferred to a configured environment.

## Task 1: complete

- Added FastAPI app/config/auth/Supabase dependency boundaries.
- RED observed: foundation tests failed at collection because Python modules did not exist.
- GREEN: `cd backend && python3 -m pytest -q` → 6 passed.
- Frontend verification: `npm test` → 25 files / 77 tests passed; `npx tsc --noEmit` passed; `npm run build` passed (existing Turbopack workspace-root warning).
- Unverified: Supabase client creation against live credentials; Python lint because ruff is not installed.

## Migration continuation (2026-11-13)

- Added Python endpoints for admin sales/feedback and payment CSV exports, product gallery uploads/removal to Supabase Storage, knowledge-document embeddings, product embedding-job processing, and vehicle CSV import.
- Added regression coverage for admin exports, upload validation, and indexing auth.
- Removed active Razorpay-specific Next order/verification/webhook routes and provider SDK type/helper; checkout UI now uses the Python provider-neutral API and pluggable browser adapters. Supabase remains the database/Auth/storage service. No concrete payment adapter is configured, so checkout is expected to fail closed until one is installed.
- Removed the old shopping-assistant UI/API (retained semantic search) and adjusted TypeScript config to ignore stale `.next/dev` route validators generated before those deletions.
- Verification: Python `pytest` → 32 passed; frontend `npm test -- --run` → 26 files / 79 tests passed; `npx tsc --noEmit` passed; migration tests → 20 passed; `npm run build` passed.
- Remaining: the Python rewrite is not fully cut over. Legacy Next.js server pages/actions and several Next API endpoints remain, including admin catalog/report UI/API, product/account reads and some indexing endpoints. Current repository therefore runs a hybrid frontend/backend; do not describe it as Python-only yet. Need migrate frontend access and auth/session propagation, remove remaining duplicate Next APIs, and test against a configured Supabase project. No live database migration or payment adapter was exercised.
- Operational note at this point: vehicle semantic indexing relied on `vehicle_knowledge` defined in `supabase/schema.sql`; addressed in the later cutover continuation below by restoring Python vector indexing.

## Backend cutover continuation (2026-11-13)

- Removed the individual Next.js API implementations and replaced them with one transport-only `/api/*` proxy that forwards method/query/body to FastAPI and adds the Supabase browser session as a bearer token. All business/data API handlers now live in Python.
- Moved admin dashboard, payment ledger, report reads, account identity, order history, and product detail reads to Python endpoints. Moved sign-in/register/reset/password update/sign-out into the Supabase browser Auth client; callback code exchange now runs in the browser.
- Removed duplicate TypeScript Supabase service-role retrieval and embedding modules. Supabase server access remains only as the cookie-session bridge for server-rendered pages and same-origin API calls; Supabase remains the data/auth/storage provider.
- Restored Python `/api/vehicles/index` and updated the product-index script to call the Python API directly.
- Verification after this cutover: `npm test -- --run` → 25 files / 77 tests; Python `pytest` → 35 passed; migration tests → 20 passed; `npx tsc --noEmit` passed; `npm run build` passed. Build reports only the existing parent `package-lock.json` Turbopack root warning.
- Remaining: production integration still needs configured Supabase and a chosen payment adapter; verify live auth callback/session cookies, storage upload, vector RPCs, and DB migrations. Next retains a transport proxy and Supabase session bridge, not a business backend. The separately preserved legacy PHP project was not modified.
- Final verification after removing unused TypeScript backend helpers: frontend `npm test -- --run` → 20 files / 67 tests; Python `pytest` → 35 passed; TypeScript check and production build passed. `app/api/[...path]/route.ts` is the only remaining Next API route.
