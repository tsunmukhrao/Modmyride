'use client';

import { useEffect, useState } from 'react';
import { products as localProducts, type Product } from '../lib/catalog';
import { parseRecentlyViewed, recordRecentlyViewed } from '../lib/recently-viewed';

const STORAGE_KEY = 'modmyride-recent-products-v1';

export function RecentlyViewed({ currentProductId }: { currentProductId?: string }) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const previousIds = parseRecentlyViewed(window.localStorage.getItem(STORAGE_KEY));
    if (currentProductId) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recordRecentlyViewed(previousIds, currentProductId)));
    const ids = previousIds.filter((id) => id !== currentProductId).slice(0, 4);
    let active = true;
    const known = new Map(localProducts.map((product) => [product.id, product]));
    const load = async () => Promise.all(ids.map(async (id) => {
      const local = known.get(id);
      if (local) return local;
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(id)}`);
        if (!response.ok) return null;
        const data = await response.json() as { product?: Product };
        return data.product ?? null;
      } catch { return null; }
    }));
    void load().then((loaded) => { if (active) setItems(loaded.filter((product): product is Product => Boolean(product))); });
    return () => { active = false; };
  }, [currentProductId]);

  if (!items.length) return null;
  return <section className="recently-viewed"><div className="recently-viewed-heading"><p className="eyebrow">YOUR GARAGE / RECENTLY VIEWED</p><h2>Back on your radar.</h2></div><div className="recently-viewed-grid">{items.map((product) => <a className="recently-viewed-card" href={`/products/${encodeURIComponent(product.id)}`} key={product.id}><img src={product.image} alt="" loading="lazy" /><span><small>{product.category}</small><strong>{product.name}</strong><b>₹{product.price.toLocaleString('en-IN')}</b></span></a>)}</div></section>;
}
