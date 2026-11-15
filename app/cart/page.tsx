'use client';

import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '../../components/site-header';
import { useCart } from '../../components/cart-provider';
import type { Product } from '../../lib/catalog';
import { getCartLineProduct } from '../../lib/cart';
import './cart.css';

export default function CartPage() {
  const { lines, ready, setQuantity, remove } = useCart();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true);
    Promise.all(lines.map(async ({ productId }) => {
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(productId)}`);
        if (!response.ok) return null;
        const data = await response.json() as { product?: Product };
        return data.product ? [productId, data.product] as const : null;
      } catch { return null; }
    })).then((items) => {
      if (active) setProducts(Object.fromEntries(items.filter((item): item is NonNullable<typeof item> => Boolean(item))));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lines, ready]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + (getCartLineProduct(products[line.productId], line)?.price ?? 0) * line.quantity, 0), [lines, products]);
  const unavailable = lines.some((line) => !getCartLineProduct(products[line.productId], line)?.inStock);
  const missing = lines.some((line) => !getCartLineProduct(products[line.productId], line));

  return <main className="subpage cart-page"><SiteHeader /><section className="cart-shell">
    <p className="eyebrow">YOUR BUILD / CART</p><h1>Parts for your<br /><em>next drive.</em></h1>
    {!ready || loading ? <p className="muted">Checking current prices and availability…</p> : !lines.length ? <div className="cart-empty"><h2>Your cart is empty.</h2><p>Find the right upgrade for your vehicle and start your build.</p><a className="button" href="/collection">Explore the collection →</a></div> : <>
      <div className="cart-grid"><div className="cart-lines">{lines.map((line) => {
        const product = products[line.productId];
        const selected = getCartLineProduct(product, line);
        return <article className="cart-line" key={`${line.productId}-${line.variantId ?? 'base'}`}><a className="cart-line-art" href={`/products/${encodeURIComponent(line.productId)}`}>{product?.image ? <img src={product.image} alt="" /> : <span>MMR</span>}</a><div className="cart-line-info"><p className="eyebrow">{product?.category ?? 'PRODUCT'}</p><h2>{product?.name ?? 'Product unavailable'}</h2><p className="muted">{line.variantId ? Object.values(selected?.options ?? {}).join(' / ') || 'Option unavailable' : product?.sku ?? line.productId}</p><p className={selected?.inStock ? 'stock-state available' : 'stock-state'}>{selected?.inStock ? 'Available' : 'Unavailable — remove or choose another part'}</p><div className="cart-line-controls"><label>Qty <input type="number" min="1" max="50" value={line.quantity} onChange={(event) => setQuantity(line.productId, Number(event.target.value), line.variantId)} /></label><button className="text-link" onClick={() => remove(line.productId, line.variantId)}>Remove</button></div></div><strong className="cart-line-price">{selected ? `₹${(selected.price * line.quantity).toLocaleString('en-IN')}` : '—'}</strong></article>;
      })}</div><aside className="cart-summary"><p className="eyebrow">ORDER SUMMARY</p><div><span>Items subtotal</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div><p className="muted">Taxes, shipping, discounts, and final stock are calculated securely at checkout.</p>{missing && <p className="cart-error">Some items are no longer available. Remove them to continue.</p>}{unavailable && !missing && <p className="cart-error">An item is out of stock. Update your cart to continue.</p>}<a className={`button ${missing || unavailable ? 'disabled-link' : ''}`} aria-disabled={missing || unavailable} href={missing || unavailable ? undefined : '/checkout'}>Continue to checkout →</a><a className="text-link cart-continue" href="/collection">Continue shopping</a></aside></div>
    </>}
  </section></main>;
}
