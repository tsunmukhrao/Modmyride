import { describe, expect, it } from 'vitest';
import { cartSyncSchema } from './cart-sync-validation';

describe('account cart sync validation', () => {
  it('accepts an empty cart and valid database product identifiers', () => {
    expect(cartSyncSchema.safeParse({ lines: [] }).success).toBe(true);
    expect(cartSyncSchema.safeParse({ lines: [{ productId: '20de9fee-a887-47ee-a648-9ef28de8a2e2', quantity: 2 }] }).success).toBe(true);
  });

  it('rejects demo identifiers and oversized quantities instead of persisting them', () => {
    expect(cartSyncSchema.safeParse({ lines: [{ productId: 'p1', quantity: 1 }] }).success).toBe(false);
    expect(cartSyncSchema.safeParse({ lines: [{ productId: '20de9fee-a887-47ee-a648-9ef28de8a2e2', quantity: 51 }] }).success).toBe(false);
  });
});
