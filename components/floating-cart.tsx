'use client';

import { getCartItemCount } from '../lib/cart';
import { useCart } from './cart-provider';

export function FloatingCart() {
  const { lines, ready } = useCart();
  const count = getCartItemCount(lines);

  return <a className="floating-cart" href="/cart" aria-label={`View cart, ${count} items`}>
    <svg className="floating-cart-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="20" r="1.4" fill="currentColor"/><circle cx="18" cy="20" r="1.4" fill="currentColor"/></svg>
    <span>Cart</span>
    <b>{ready ? count : '—'}</b>
  </a>;
}
