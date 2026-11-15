import { describe, expect, it } from 'vitest';
import { getCartLineProduct, mergeCartLines, normalizeCartLines, setCartQuantity, type CartLine } from './cart';

describe('cart line operations', () => {
  it('drops malformed lines and caps quantity to the supported limit', () => {
    expect(normalizeCartLines([{ productId: 'sku-a', quantity: 70 }, { productId: '', quantity: 1 }, { productId: 'sku-b', quantity: 0 }])).toEqual([
      { productId: 'sku-a', quantity: 50 },
    ]);
  });

  it('updates quantity and removes the item when quantity becomes zero', () => {
    const original: CartLine[] = [{ productId: 'sku-a', quantity: 2 }, { productId: 'sku-b', quantity: 1 }];
    expect(setCartQuantity(original, 'sku-a', 4)).toEqual([{ productId: 'sku-a', quantity: 4 }, { productId: 'sku-b', quantity: 1 }]);
    expect(setCartQuantity(original, 'sku-b', 0)).toEqual([{ productId: 'sku-a', quantity: 2 }]);
  });

  it('merges guest and account carts without exceeding the per-item limit', () => {
    expect(mergeCartLines([{ productId: 'sku-a', quantity: 45 }], [{ productId: 'sku-a', quantity: 10 }, { productId: 'sku-b', quantity: 1 }])).toEqual([
      { productId: 'sku-a', quantity: 50 }, { productId: 'sku-b', quantity: 1 },
    ]);
  });

  it('keeps different variants separate and merges matching variants', () => {
    expect(normalizeCartLines([
      { productId: 'sku-a', variantId: 'red', quantity: 1 },
      { productId: 'sku-a', variantId: 'blue', quantity: 2 },
      { productId: 'sku-a', variantId: 'red', quantity: 3 },
    ])).toEqual([
      { productId: 'sku-a', variantId: 'red', quantity: 4 },
      { productId: 'sku-a', variantId: 'blue', quantity: 2 },
    ]);
  });

  it('uses the server-returned variant price and availability instead of the base product', () => {
    const product = { id: 'p', sku: 'p', name: 'Mats', category: 'Interior', price: 3000, image: '', description: '', tags: [], vehicles: [], inStock: true, variants: [{ id: 'v1', sku: 'p-v1', options: { fit: '2013–17' }, price: 3400, inStock: false }] };
    expect(getCartLineProduct(product, { productId: 'p', variantId: 'v1', quantity: 1 })).toEqual({ price: 3400, inStock: false, options: { fit: '2013–17' } });
    expect(getCartLineProduct(product, { productId: 'p', variantId: 'missing', quantity: 1 })).toBeUndefined();
  });
});
