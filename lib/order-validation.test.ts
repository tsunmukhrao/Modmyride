import { describe, expect, it } from 'vitest';
import { checkoutSchema } from './order-validation';

const validOrder = {
  items: [{ productId: '20de9fee-a887-47ee-a648-9ef28de8a2e2', quantity: 2 }],
  shipping: { recipient: 'A. Singh', phone: '9876543210', line1: '12 MG Road', city: 'Bengaluru', region: 'Karnataka', postalCode: '560001', countryCode: 'IN' },
  idempotencyKey: 'checkout-20261104-1',
};

describe('checkout request validation', () => {
  it('accepts product ids and shipping data without accepting client prices', () => {
    const result = checkoutSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
    if (result.success) expect('total' in result.data).toBe(false);
  });

  it('rejects invalid product ids and quantities before reaching the order RPC', () => {
    expect(checkoutSchema.safeParse({ ...validOrder, items: [{ productId: 'p1', quantity: 0 }] }).success).toBe(false);
  });

  it('rejects incomplete shipping addresses', () => {
    expect(checkoutSchema.safeParse({ ...validOrder, shipping: { recipient: 'A. Singh' } }).success).toBe(false);
  });
});
