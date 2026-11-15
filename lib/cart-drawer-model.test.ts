import { describe, expect, it } from 'vitest';
import { getCartDrawerSummary } from './cart-drawer-model';

describe('cart drawer summary', () => {
  it('sums line prices and blocks checkout when a cart product is missing or unavailable', () => {
    expect(getCartDrawerSummary(
      [{ productId: 'mat', quantity: 2 }, { productId: 'filter', quantity: 1 }],
      { mat: { price: 1200, inStock: true }, filter: { price: 500, inStock: false } },
    )).toEqual({ subtotal: 2900, canCheckout: false });
  });

  it('allows checkout when every cart product is available', () => {
    expect(getCartDrawerSummary([{ productId: 'mat', quantity: 2 }], { mat: { price: 1200, inStock: true } }))
      .toEqual({ subtotal: 2400, canCheckout: true });
  });

  it('uses the selected variant price and blocks checkout for a missing variant', () => {
    expect(getCartDrawerSummary([{ productId: 'mat', variantId: 'v1', quantity: 2 }], {
      mat: { price: 1000, inStock: true, variants: [{ id: 'v1', price: 1500, inStock: true }] },
    })).toEqual({ subtotal: 3000, canCheckout: true });
    expect(getCartDrawerSummary([{ productId: 'mat', variantId: 'missing', quantity: 1 }], {
      mat: { price: 1000, inStock: true, variants: [] },
    })).toEqual({ subtotal: 0, canCheckout: false });
  });
});
