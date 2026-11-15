'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { products as localProducts, type Product } from '../lib/catalog';
import { getCartDrawerSummary } from '../lib/cart-drawer-model';
import { getCartLineProduct } from '../lib/cart';
import { useCart } from './cart-provider';

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines, ready, setQuantity, remove } = useCart();
  const [productById, setProductById] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !ready) return;
    let active = true;
    const local = Object.fromEntries(lines.flatMap(({ productId }) => {
      const product = localProducts.find((item) => item.id === productId);
      return product ? [[productId, product]] : [];
    }));
    setProductById(local);
    setLoading(lines.length > Object.keys(local).length);
    Promise.all(lines.map(async ({ productId }) => {
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(productId)}`);
        if (!response.ok) return null;
        const data = await response.json() as { product?: Product };
        return data.product ? [productId, data.product] as const : null;
      } catch { return null; }
    })).then((items) => {
      if (!active) return;
      setProductById((current) => ({ ...current, ...Object.fromEntries(items.filter((item): item is NonNullable<typeof item> => Boolean(item))) }));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, ready, lines]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const focusable = Array.from(document.querySelectorAll<HTMLElement>('.cart-drawer a[href], .cart-drawer button:not([disabled])'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  const summary = useMemo(() => getCartDrawerSummary(lines, productById), [lines, productById]);
  if (!open) return null;

  return <div className="cart-drawer-layer">
    <button className="cart-drawer-backdrop" type="button" onClick={onClose} aria-label="Close cart panel" />
    <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
      <header className="cart-drawer-header"><div><p className="eyebrow">YOUR BUILD / {lines.length.toString().padStart(2, '0')} LINES</p><h2 id="cart-drawer-title">Your cart<span>.</span></h2></div><button ref={closeButtonRef} className="cart-drawer-close" type="button" onClick={onClose} aria-label="Close cart">×</button></header>
      {!ready || (loading && lines.length > 0) ? <p className="cart-drawer-message">Checking current prices and stock…</p> : !lines.length ? <div className="cart-drawer-empty"><p>Your cart is empty.</p><span>Find the right upgrade for your next drive.</span><a className="button" href="/collection" onClick={onClose}>Explore the collection ↗</a></div> : <>
        <div className="cart-drawer-lines">{lines.map((line) => {
          const product = productById[line.productId];
          return <article className="cart-drawer-line" key={line.productId}>
            <a className="cart-drawer-image" href={`/products/${encodeURIComponent(line.productId)}`} onClick={onClose}>{product?.image ? <img src={product.image} alt="" /> : <span>MMR</span>}</a>
            <div className="cart-drawer-info"><p className="eyebrow">{product?.category ?? 'PRODUCT'}</p><a href={`/products/${encodeURIComponent(line.productId)}`} onClick={onClose}>{product?.name ?? 'Product unavailable'}</a>{line.variantId && <small className="cart-drawer-option">{Object.values(product?.variants?.find((variant) => variant.id === line.variantId)?.options ?? {}).join(' / ') || 'Option unavailable'}</small>}<strong>{getCartLineProduct(product, line) ? `₹${((getCartLineProduct(product, line)?.price ?? 0) * line.quantity).toLocaleString('en-IN')}` : 'Price unavailable'}</strong><div className="cart-drawer-quantity" aria-label={`Quantity for ${product?.name ?? 'product'}`}><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(line.productId, line.quantity - 1, line.variantId)}>−</button><span>{line.quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity(line.productId, line.quantity + 1, line.variantId)}>+</button><button className="cart-drawer-remove" type="button" onClick={() => remove(line.productId, line.variantId)}>Remove</button></div></div>
          </article>;
        })}</div>
        <div className="cart-drawer-footer"><div className="cart-drawer-subtotal"><span>Subtotal</span><strong>₹{summary.subtotal.toLocaleString('en-IN')}</strong></div><p>Shipping, taxes, and final availability are confirmed at checkout.</p><a className={`button ${summary.canCheckout ? '' : 'disabled-link'}`} aria-disabled={!summary.canCheckout} href={summary.canCheckout ? '/checkout' : undefined} onClick={summary.canCheckout ? onClose : undefined}>Continue to checkout →</a><a className="cart-drawer-view-cart" href="/cart" onClick={onClose}>View full cart</a></div>
      </>}
    </aside>
  </div>;
}
