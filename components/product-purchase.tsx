'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './cart-provider';
import type { ProductVariant } from '../lib/catalog';

export function ProductPurchase({ productId, inStock, variants = [] }: { productId: string; inStock: boolean; variants?: ProductVariant[] }) {
  const router = useRouter();
  const { add, ready } = useCart();
  const [added, setAdded] = useState(false);
  const [variantId, setVariantId] = useState('');
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const available = selectedVariant ? selectedVariant.inStock : variants.length === 0 && inStock;
  function purchase(buyNow: boolean) {
    if (!available || !ready) return;
    add(productId, 1, variantId || undefined);
    if (buyNow) router.push('/checkout');
    else setAdded(true);
  }

  return <div className="purchase-actions">
    {variants.length > 0 && <label className="product-option-picker">Choose your fit<select value={variantId} onChange={(event) => { setVariantId(event.target.value); setAdded(false); }}><option value="">Select an option</option>{variants.map((variant) => <option key={variant.id} value={variant.id} disabled={!variant.inStock}>{Object.values(variant.options).join(' / ')} — ₹{variant.price.toLocaleString('en-IN')}{variant.inStock ? '' : ' (out of stock)'}</option>)}</select></label>}
    <button type="button" className="button" disabled={!available || !ready} onClick={() => purchase(false)}>{added ? 'Added to cart ✓' : 'Add to cart →'}</button>
    <button type="button" className="ghost" disabled={!available || !ready} onClick={() => purchase(true)}>Buy now ↗</button>
    {variants.length > 0 && !variantId && <span className="purchase-hint">Choose an available option to continue.</span>}
    {variants.length > 0 && variantId && !selectedVariant?.inStock && <span className="purchase-hint">That option is out of stock.</span>}
    {added && <a className="text-link" href="/cart">View cart →</a>}
  </div>;
}
