import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('./migrations/202611130001_product_variants.sql', import.meta.url), 'utf8');

describe('product variant migration', () => {
  it('stores product-owned variants and allows multiple variant lines in carts/orders', () => {
    expect(migration).toContain('create table if not exists public.product_variants');
    expect(migration).toContain('variant_id uuid');
    expect(migration).toContain('cart_items_variant_uidx');
    expect(migration).toContain('order_items_variant_uidx');
  });

  it('recalculates variant price and stock in the transactional order procedure', () => {
    expect(migration).toContain("selected_variant_id := nullif(item->>'variant_id','')::uuid");
    expect(migration).toContain('variant_row.price');
    expect(migration).toContain('variant_row.quantity-variant_row.reserved');
  });

  it('keeps product variants publicly readable only when active and makes writes admin-only', () => {
    expect(migration).toContain('product_variants_public_read');
    expect(migration).toContain('product_variants_admin_manage');
  });
});
