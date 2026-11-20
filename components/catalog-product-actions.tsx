'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './cart-provider';
import type { Product } from '../lib/catalog';

export function CatalogProductActions({ product, live }: { product: Product; live: boolean }) {
  const router = useRouter();
  const { add, ready } = useCart();
  const [variantId, setVariantId] = useState('');
  const [notice, setNotice] = useState('');
  const variants = product.variants ?? [];
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const available = live && (variants.length ? Boolean(selectedVariant?.inStock) : product.inStock);
  const disabledReason = !live ? 'Live catalog item and stock required' : variants.length && !variantId ? 'Choose an option first' : 'Currently out of stock';

  function addToCart(buyNow: boolean) {
    if (!available || !ready) return;
    add(product.id, 1, variantId || undefined);
    if (buyNow) router.push('/checkout');
    else setNotice('Added to cart.');
  }

  return <div className="catalog-card-actions">
    {variants.length > 0 && <label className="catalog-card-option">Choose option<select value={variantId} onChange={(event) => { setVariantId(event.target.value); setNotice(''); }}><option value="">Select fit</option>{variants.map((variant) => <option key={variant.id} value={variant.id} disabled={!variant.inStock}>{Object.values(variant.options).join(' / ') || variant.sku} · ₹{variant.price.toLocaleString('en-IN')}{variant.inStock ? '' : ' · out of stock'}</option>)}</select></label>}
    <div className="catalog-card-buttons"><button type="button" className="button" disabled={!ready || !available} title={!ready ? 'Restoring cart…' : available ? undefined : disabledReason} onClick={() => addToCart(false)}>Add to cart</button><button type="button" className="ghost" disabled={!ready || !available} title={!ready ? 'Restoring cart…' : available ? undefined : disabledReason} onClick={() => addToCart(true)}>Buy now ↗</button></div>
    {!live && <small className="catalog-card-stock-note">Live product and stock required</small>}
    {live && !available && <small className="catalog-card-stock-note">{disabledReason}</small>}
    {notice && <small className="catalog-card-added" role="status">{notice} <a href="/cart">View cart →</a></small>}
  </div>;
}
