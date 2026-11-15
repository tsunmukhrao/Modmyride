'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { mergeCartLines, normalizeCartLines, setCartQuantity, type CartLine } from '../lib/cart';

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  add: (productId: string, quantity?: number, variantId?: string) => void;
  setQuantity: (productId: string, quantity: number, variantId?: string) => void;
  remove: (productId: string, variantId?: string) => void;
  clear: () => void;
};

const STORAGE_KEY = 'modmyride-cart-v1';
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [accountSyncReady, setAccountSyncReady] = useState(false);
  const [accountCartActive, setAccountCartActive] = useState(false);
  const accountWasActive = useRef(false);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const pathname = usePathname();

  useEffect(() => {
    try { setLines(normalizeCartLines(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))); }
    catch { setLines([]); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (accountCartActive) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready, accountCartActive]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    fetch('/api/cart').then(async (response) => {
      if (!response.ok) return null;
      return await response.json() as { authenticated?: boolean; lines?: CartLine[] };
    }).then((data) => {
      if (!active) return;
      if (data?.authenticated) {
        const firstAccountSync = !accountWasActive.current;
        accountWasActive.current = true;
        setAccountCartActive(true);
        if (firstAccountSync) setLines((current) => mergeCartLines(current, normalizeCartLines(data.lines)));
      } else {
        if (accountWasActive.current) localStorage.setItem(STORAGE_KEY, JSON.stringify(linesRef.current));
        accountWasActive.current = false;
        setAccountCartActive(false);
      }
    }).catch(() => undefined).finally(() => { if (active) setAccountSyncReady(true); });
    return () => { active = false; };
  }, [ready, pathname]);

  useEffect(() => {
    if (!ready || !accountSyncReady || !accountCartActive) return;
    const timer = window.setTimeout(() => {
      void fetch('/api/cart', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [lines, ready, accountSyncReady, accountCartActive]);

  const add = useCallback((productId: string, quantity = 1, variantId?: string) => {
    setLines((current) => normalizeCartLines([...current, { productId, ...(variantId ? { variantId } : {}), quantity }]));
  }, []);
  const update = useCallback((productId: string, quantity: number, variantId?: string) => setLines((current) => setCartQuantity(current, productId, quantity, variantId)), []);
  const remove = useCallback((productId: string, variantId?: string) => setLines((current) => current.filter((line) => line.productId !== productId || line.variantId !== variantId)), []);
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo(() => ({ lines, ready, add, setQuantity: update, remove, clear }), [lines, ready, add, update, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
