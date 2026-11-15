import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('./migrations/202611040001_commerce_search.sql', import.meta.url), 'utf8');

describe('commerce migration safety invariants', () => {
  it('does not permit client inserts that bypass the transactional order procedure', () => {
    expect(/create policy orders_customer_insert/.test(migration)).toBe(false);
    expect(/function public\.place_order\(/.test(migration)).toBe(true);
  });

  it('prevents duplicate cart lines from bypassing stock checks', () => {
    expect(/value->>'quantity'\)::int as quantity/.test(migration)).toBe(true);
    expect(/sum\(quantity\)/.test(migration)).toBe(true);
    expect(/order by product_id/.test(migration)).toBe(true);
  });

  it('requires a delivered matching order before a review can be inserted and keeps customer edits moderated', () => {
    expect(/function public\.enforce_verified_review\(\)/.test(migration)).toBe(true);
    expect(/o\.status='delivered'[\s\S]*oi\.product_id=new\.product_id/.test(migration)).toBe(true);
    expect(/new\.status := 'pending'/.test(migration)).toBe(true);
    expect(/create trigger verified_review_guard before insert or update on public\.reviews/.test(migration)).toBe(true);
  });

  it('syncs a signed-in customer cart in one database transaction', () => {
    expect(/function public\.sync_customer_cart\(p_items jsonb\)/.test(migration)).toBe(true);
    expect(/delete from public\.cart_items where cart_id=customer_cart_id/.test(migration)).toBe(true);
    expect(/grant execute on function public\.sync_customer_cart\(jsonb\) to authenticated/.test(migration)).toBe(true);
  });

  it('reserves inventory until a trusted payment event is applied and deduplicates webhook events', () => {
    const orderFunction = migration.match(/create or replace function public\.place_order\([\s\S]*?end; \$\$;/)?.[0] ?? '';
    expect(/reserved=reserved\+qty/.test(orderFunction)).toBe(true);
    expect(/function public\.apply_razorpay_event\(/.test(migration)).toBe(true);
    expect(/unique\(provider,event_id\)/.test(migration)).toBe(true);
  });

  it('restricts order fulfillment changes to administrators and records audit, timeline, and notifications transactionally', () => {
    const updater = migration.match(/create or replace function public\.admin_update_order_fulfillment\([\s\S]*?end; \$\$;/)?.[0] ?? '';
    expect(updater).toContain('if not public.is_admin()');
    expect(updater).toContain('insert into public.order_status_history');
    expect(updater).toContain('insert into public.audit_logs');
    expect(updater).toContain('insert into public.notifications');
    expect(updater).toContain("order_row.payment_status<>'paid'");
    expect(migration).toContain('grant execute on function public.admin_update_order_fulfillment');
  });

  it('keeps admin product, stock, specification, and fitment edits atomic', () => {
    const updater = migration.match(/create or replace function public\.admin_save_product\([\s\S]*?end; \$\$;/)?.[0] ?? '';
    expect(updater).toContain('if not public.is_admin()');
    expect(updater).toContain('Stock cannot be lower than currently reserved inventory');
    expect(updater).toContain('public.stock_movements');
    expect(updater).toContain('public.product_specs');
    expect(updater).toContain('public.product_compatibility');
    expect(updater).toContain('public.audit_logs');
    expect(migration).toContain('grant execute on function public.admin_save_product');
    expect(migration).toContain('function public.admin_archive_product');
  });

  it('provides rollback entries for the admin product procedures', () => {
    const rollback = readFileSync(new URL('./rollback/202611040001_commerce_search.sql', import.meta.url), 'utf8');
    expect(rollback).toContain('drop function if exists public.admin_save_product');
    expect(rollback).toContain('drop function if exists public.admin_archive_product');
  });

  it('allows administrator image-upload routes to audit storage changes and removes the policy on rollback', () => {
    expect(migration).toContain('create policy audit_logs_admin_insert on public.audit_logs for insert with check(public.is_admin())');
    const rollback = readFileSync(new URL('./rollback/202611040001_commerce_search.sql', import.meta.url), 'utf8');
    expect(rollback).toContain('drop policy if exists audit_logs_admin_insert');
  });

  it('protects category hierarchy edits from cycles and blocks archiving non-empty categories without reassignment', () => {
    const save = migration.match(/create or replace function public\.admin_save_category\([\s\S]*?end; \$\$;/)?.[0] ?? '';
    const archive = migration.match(/create or replace function public\.admin_archive_category\([\s\S]*?end; \$\$;/)?.[0] ?? '';
    expect(save).toContain('Administrator access required');
    expect(save).toContain('Category hierarchy cannot contain a cycle');
    expect(archive).toContain('Category contains products or child categories');
    expect(archive).toContain('update public.products set category_id=p_reassign_to');
    expect(migration).toContain('grant execute on function public.admin_save_category');
  });

  it('protects profile roles from self-service changes', () => {
    expect(/function public\.protect_profile_role\(\)/.test(migration)).toBe(true);
    expect(/new\.role is distinct from old\.role/.test(migration)).toBe(true);
  });

});

describe('keyword search schema', () => {
  const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  const cleanup = readFileSync(new URL('./migrations/202611140001_remove_pgvector.sql', import.meta.url), 'utf8');

  it('keeps PostgreSQL full-text search and excludes pgvector objects', () => {
    for (const sql of [schema, migration]) {
      expect(sql.toLowerCase()).not.toContain('create extension if not exists vector');
      expect(sql.toLowerCase()).not.toMatch(/\bembedding\s+vector\b/);
      expect(sql.toLowerCase()).not.toContain('match_product_embeddings');
    }
    expect(schema).toContain('search_vector tsvector');
    expect(migration).not.toMatch(/\bvector\b/i);
  });

  it('cleans previously installed vector objects and documents the irreversible data removal', () => {
    expect(cleanup).toContain('drop table if exists');
    expect(cleanup).toContain('drop extension if exists vector');
    expect(cleanup).toContain('cannot be rolled back');
    expect(cleanup).toContain('match_product_embeddings');
  });
});

describe('seed catalog', () => {
  const seed = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');

  it('contains at least fifty products across eight categories and seeds fitment', () => {
    const productRows = seed.split('), upserted as (')[0].split('\n').filter((line) => /^\s*\('MMR-/.test(line));
    const seededCategories = seed.match(/\('(?:Interior|Exterior|Lighting|Wheels & Tyres|Audio & Tech|Safety & Maintenance|Car Care & Utility|Performance)',/g) ?? [];
    expect(productRows.length).toBeGreaterThanOrEqual(50);
    expect(seededCategories).toHaveLength(8);
    expect(seed).toContain('insert into public.product_compatibility');
  });

  it('seeds Ford-specific demonstration parts and India Ford vehicle fitment', () => {
    expect(seed).toContain('MMR-FORD-');
    expect(seed).toContain("('Ford', 'EcoSport'");
    expect(seed).toContain("('Ford', 'Figo'");
    expect(seed).toContain('Ford demo fitment');
    for (const image of [
      '/images/products/ford-ecosport-floor-mats.png',
      '/images/products/ford-wiper-blades.png',
      '/images/products/ford-endeavour-cargo-liner.png',
      '/images/products/ford-cabin-filter.png',
      '/images/products/ford-mustang-floor-mats.png',
    ]) {
      expect(seed).toContain(image);
      expect(existsSync(new URL(`../public${image}`, import.meta.url))).toBe(true);
    }
  });
});

describe('administrator reports migration', () => {
  const reports = readFileSync(new URL('./migrations/202611050001_admin_reports.sql', import.meta.url), 'utf8');
  const rollback = readFileSync(new URL('./rollback/202611050001_admin_reports.sql', import.meta.url), 'utf8');

  it('restricts sales and feedback report RPCs to admins and limits requests to one year', () => {
    expect(reports).toContain('function public.admin_sales_report(p_from date,p_to date)');
    expect(reports).toContain('function public.admin_feedback_report(p_from date,p_to date)');
    expect(reports.match(/if not public\.is_admin\(\)/g)).toHaveLength(2);
    expect(reports.match(/p_to\s*-\s*p_from\s*>\s*365/g)).toHaveLength(2);
    expect(reports).toContain('grant execute on function public.admin_sales_report(date,date) to authenticated');
    expect(reports).toContain('grant execute on function public.admin_feedback_report(date,date) to authenticated');
  });

  it('includes refunds, tax, product/category sales, rating trends, low ratings, and complaint themes', () => {
    for (const term of ['refunds', 'tax_total', 'order_items', 'categories', 'generate_series', 'reviews', 'rating', 'complaint_themes']) {
      expect(reports.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it('provides rollback for both report functions', () => {
    expect(rollback).toContain('drop function if exists public.admin_sales_report(date,date)');
    expect(rollback).toContain('drop function if exists public.admin_feedback_report(date,date)');
  });
});

describe('provider-neutral payment migration', () => {
  const payments = readFileSync(new URL('./migrations/202611130002_provider_neutral_payments.sql', import.meta.url), 'utf8');
  const rollback = readFileSync(new URL('./rollback/202611130002_provider_neutral_payments.sql', import.meta.url), 'utf8');

  it('applies signed events generically by provider and rolls back cleanly', () => {
    expect(payments).toContain('function public.apply_payment_event(');
    expect(payments).toContain("where provider=p_provider and provider_reference=p_gateway_order_id for update");
    expect(payments).toContain('on conflict(provider,event_id) do nothing');
    expect(payments).toContain('drop function if exists public.apply_razorpay_event');
    expect(rollback).toContain('drop function if exists public.apply_payment_event');
    expect(rollback).toContain('create unique index if not exists payments_one_pending_razorpay_order_uidx');
  });
});

describe('WooCommerce commerce extensions', () => {
  const variants = readFileSync(new URL('./migrations/202611130001_product_variants.sql', import.meta.url), 'utf8');
  const bundles = readFileSync(new URL('./migrations/202611130003_product_bundles.sql', import.meta.url), 'utf8');
  const returns = readFileSync(new URL('./migrations/202611130004_return_requests.sql', import.meta.url), 'utf8');
  const notifications = readFileSync(new URL('./migrations/202611130005_order_notifications.sql', import.meta.url), 'utf8');

  it('releases and consumes reserved variant inventory in server procedures', () => {
    expect(variants).toContain("if item_row.variant_id is not null then");
    expect(variants).toContain('public.product_variants set reserved=greatest(0,reserved-item_row.quantity)');
    expect(variants).toContain('function public.admin_update_order_fulfillment');
    const payment = readFileSync(new URL('./migrations/202611130002_provider_neutral_payments.sql', import.meta.url), 'utf8');
    expect(payment).toContain('Reserved variant stock invariant failed');
  });

  it('stores admin-curated bundles with active product, compatibility-ready membership, and no default discount', () => {
    expect(bundles).toContain('create table if not exists public.product_bundles');
    expect(bundles).toContain('create table if not exists public.bundle_items');
    expect(bundles).toContain('discount_percent numeric(5,2) not null default 0');
    expect(bundles).toContain('product_bundles_admin_manage');
    expect(bundles).toContain('MMR-FORD-001');
  });

  it('records customer cancellation and return requests without mutating order or payment status', () => {
    expect(returns).toContain('one_active_order_request_per_kind_idx');
    expect(returns).toContain("status in ('pending','approved')");
    expect(returns).toContain('order_requests_owner_insert');
    expect(returns).not.toMatch(/update public\.orders|update public\.payments/);
  });

  it('persists idempotent notification events without exposing a provider credential to clients', () => {
    expect(notifications).toContain('order_notifications');
    expect(notifications).toContain('idempotency_key text not null unique');
    expect(notifications).toContain('order_notifications_owner_read');
  });
});

describe('customer transaction history migration', () => {
  const migration = readFileSync(new URL('./migrations/202611060001_customer_payments.sql', import.meta.url), 'utf8');
  const rollback = readFileSync(new URL('./rollback/202611060001_customer_payments.sql', import.meta.url), 'utf8');

  it('allows customers to read only payments and refunds belonging to their own orders', () => {
    expect(migration).toContain('create policy payments_customer_read');
    expect(migration).toContain('o.user_id=auth.uid()');
    expect(migration).toContain('create policy refunds_customer_read');
    expect(migration).toContain('py.order_id');
    expect(rollback).toContain('drop policy if exists payments_customer_read');
    expect(rollback).toContain('drop policy if exists refunds_customer_read');
  });
});
