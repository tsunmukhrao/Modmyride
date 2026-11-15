'use client';

import { useEffect, useState } from 'react';
import type { Product } from '../lib/catalog';

export function RelatedProducts({ productId }: { productId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`/api/products/${encodeURIComponent(productId)}/similar`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data) { setProducts(data.products ?? []); setCategory(data.category ?? ''); } })
      .catch(() => undefined);
    return () => { active = false; };
  }, [productId]);

  if (!products.length) return null;
  return <section className="related-products"><div><p className="eyebrow">SELECTED FOR THIS BUILD / {category.toUpperCase()}</p><h2>More from this category.</h2><p className="muted">Prioritised by category and vehicle fitment.</p></div><div className="related-grid">{products.map((product) => <a className="related-card" key={product.id} href={`/products/${encodeURIComponent(product.id)}`}><span>{product.category.toUpperCase()}</span><h3>{product.name}</h3><strong>₹{product.price.toLocaleString('en-IN')}</strong><em>View product ↗</em></a>)}</div></section>;
}
