'use client';

import { useState } from 'react';
import { useCart } from './cart-provider';
import type { ProductVariant } from '../lib/catalog';

export function ProductPurchase({ productId, inStock, variants = [] }: { productId: string; inStock: boolean; variants?: ProductVariant[] }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [variantId, setVariantId] = useState('');
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const available = selectedVariant ? selectedVariant.inStock : variants.length === 0 && inStock;
  return <div className="purchase-actions">
    {variants.length > 0 && <label className="product-option-picker">Choose your fit<select value={variantId} onChange={(event) => { setVariantId(event.target.value); setAdded(false); }}><option value="">Select an option</option>{variants.map((variant) => <option key={variant.id} value={variant.id} disabled={!variant.inStock}>{Object.values(variant.options).join(' / ')} — ₹{variant.price.toLocaleString('en-IN')}{variant.inStock ? '' : ' (out of stock)'}</option>)}</select></label>}
    <button type="button" className="button" disabled={!available} onClick={() => { add(productId, 1, variantId || undefined); setAdded(true); }}>
      {available ? added ? 'Added to cart ✓' : 'Add to cart →' : variants.length > 0 && !variantId ? 'Choose an option first' : 'Currently unavailable'}
    </button>
    {added && <a className="text-link" href="/cart">View cart →</a>}
  </div>;
}
