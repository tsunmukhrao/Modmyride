'use client';

import { useMemo, useState } from 'react';
import { useCart } from './cart-provider';

type BundleVariant = { id: string; options: Record<string, string>; price: number; inStock: boolean };
type BundleProduct = { id: string; name: string; sku: string; image: string; price: number; inStock: boolean; quantity: number; variants: BundleVariant[] };
type Bundle = { id: string; title: string; description: string; discountPercent: number; subtotal: number; discount: number; total: number; items: BundleProduct[] };

export function ProductBundles({ bundles }: { bundles: Bundle[] }) {
  const { add } = useCart();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [added, setAdded] = useState('');
  const totals = useMemo(() => Object.fromEntries(bundles.map((bundle) => {
    const subtotal = bundle.items.reduce((sum, item) => {
      const variant = item.variants.find((entry) => entry.id === selected[item.id]);
      return sum + (variant?.price ?? item.price) * item.quantity;
    }, 0);
    return [bundle.id, subtotal - Math.round(subtotal * bundle.discountPercent / 100)];
  })), [bundles, selected]);
  if (!bundles.length) return null;
  return <section className="product-bundles"><div><p className="eyebrow">COMPLETE THE BUILD / COMPATIBLE SETS</p><h2>Put the right parts together.</h2></div>{bundles.map((bundle) => {
    const ready = bundle.items.every((item) => item.inStock && (!item.variants.length || (selected[item.id] && item.variants.some((variant) => variant.id === selected[item.id] && variant.inStock))));
    return <article className="bundle-card" key={bundle.id}><div className="bundle-heading"><div><h3>{bundle.title}</h3><p>{bundle.description}</p></div><strong>₹{Number(totals[bundle.id]).toLocaleString('en-IN')}</strong></div><div className="bundle-items">{bundle.items.map((item) => <div className="bundle-item" key={item.id}><img src={item.image || '/images/products/ford-ecosport-floor-mats.png'} alt="" /><div><strong>{item.name}</strong><small>{item.sku} · qty {item.quantity}</small>{item.variants.length > 0 && <label className="bundle-option">Choose option<select value={selected[item.id] ?? ''} onChange={(event) => setSelected((value) => ({ ...value, [item.id]: event.target.value }))}><option value="">Select fitment</option>{item.variants.map((variant) => <option key={variant.id} value={variant.id} disabled={!variant.inStock}>{Object.values(variant.options).join(' · ')} · ₹{variant.price.toLocaleString('en-IN')}{variant.inStock ? '' : ' · unavailable'}</option>)}</select></label>}</div><span>{item.inStock ? 'AVAILABLE' : 'OUT OF STOCK'}</span></div>)}</div><div className="bundle-footer"><small>{bundle.discountPercent ? `${bundle.discountPercent}% configured bundle discount` : 'Individual item prices · no bundle discount'}</small><button type="button" className="button" disabled={!ready} onClick={() => { bundle.items.forEach((item) => add(item.id, item.quantity, selected[item.id])); setAdded(bundle.id); }}>{added === bundle.id ? 'ADDED TO CART ✓' : 'ADD COMPATIBLE SET →'}</button></div></article>;
  })}</section>;
}
