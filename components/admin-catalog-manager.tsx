'use client';

import { useMemo, useState } from 'react';
import { AdminProductEditor, type EditableProduct } from './admin-product-editor';

type Option = { id: string; name: string };
type Vehicle = { id: string; make: string; model: string; year_from: number | null; year_to: number | null };
type Props = { products: EditableProduct[]; categories: Option[]; brands: Option[]; vehicles: Vehicle[] };
const PAGE_SIZE = 20;

export function AdminCatalogManager({ products, categories, brands, vehicles }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query.trim().toLowerCase())), [products, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const vehicleOptionsForEdit = (product: EditableProduct) => {
    const knownIds = new Set(product.product_compatibility.map((fitment) => fitment.vehicle_id));
    return vehicles.filter((vehicle, index) => index < 40 || knownIds.has(vehicle.id));
  };

  return <>
    <AdminProductEditor categories={categories} brands={brands} vehicles={vehicles} />
    <div className="admin-catalog-tools"><label>Filter catalog<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search name or SKU" /></label><span className="muted">{filtered.length} products</span></div>
    <div className="admin-table admin-catalog-table">{visible.length ? visible.map((product) => <div className="admin-catalog-row" key={product.id}><div><strong>{product.name}</strong><span className="muted">{product.sku} · {product.deleted_at ? 'archived' : product.status}</span></div><strong>₹{Number(product.price).toLocaleString('en-IN')}</strong><button className="ghost" type="button" onClick={() => setEditingId(editingId === product.id ? null : product.id)}>{editingId === product.id ? 'Close edit' : 'Edit product'}</button>{editingId === product.id && <div className="admin-catalog-edit"><AdminProductEditor categories={categories} brands={brands} vehicles={vehicleOptionsForEdit(product)} product={product} expanded /></div>}</div>) : <p className="admin-empty">No products match that search.</p>}</div>
    {pageCount > 1 && <nav className="admin-pagination" aria-label="Catalog pages"><button className="ghost" type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>← Previous</button><span className="muted">Page {page} / {pageCount}</span><button className="ghost" type="button" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next →</button></nav>}
  </>;
}
