'use client';

import { useEffect, useState } from 'react';
import { AdminOrderUpdater } from './admin-order-updater';
import { AdminCatalogManager } from './admin-catalog-manager';
import type { EditableProduct } from './admin-product-editor';
import { AdminCategoryManager, type EditableCategory } from './admin-category-manager';
import { backendFetch } from '../lib/backend-api';

type ProductRow = EditableProduct;
type OrderRow = { id: string; status: string; payment_status: string; total: number; currency: string; created_at: string };
type Option = { id: string; name: string };
type VehicleOption = { id: string; make: string; model: string; year_from: number | null; year_to: number | null };
type Dashboard = { products: ProductRow[]; orders: OrderRow[]; categories: EditableCategory[]; brands: Option[]; vehicles: VehicleOption[] };

export function AdminDashboard({ section = 'overview' }: { section?: 'overview' | 'orders' | 'products' | 'categories' | 'inventory' }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void backendFetch('/api/admin/dashboard')
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || `Admin API returned ${response.status}.`);
        }
        return response.json() as Promise<Dashboard>;
      })
      .then((data) => { if (active) setDashboard(data); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load admin data.');
      });
    return () => { active = false; };
  }, []);

  const products = dashboard?.products ?? [];
  const orders = dashboard?.orders ?? [];
  const categories = dashboard?.categories ?? [];
  const activeCategories = categories.filter((category) => category.active).map(({ id, name }) => ({ id, name }));
  const brands = dashboard?.brands ?? [];
  const vehicles = dashboard?.vehicles ?? [];
  const activeProducts = products.filter((product) => product.status === 'active' && !product.deleted_at);
  const lowStock = activeProducts.filter((product) => {
    const inventory = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
    return !inventory || inventory.quantity - inventory.reserved <= inventory.low_stock_threshold;
  }).length;
  const paidOrders = orders.filter((order) => order.payment_status === 'paid').length;

  return <section className="admin-shell">
      {section === 'overview' ? <><div className="section-heading"><div><p className="eyebrow">CONTROL ROOM / OPERATIONS</p><h1>Store, in one view.</h1><p className="muted">Live catalog, stock, and order operations</p></div><div className="admin-quick-links"><a className="ghost" href="/admin/payments">Payment ledger →</a><a className="ghost" href="/admin/reports">Reports &amp; signals →</a></div></div>
      <div className="admin-stats"><div><span className="muted">ACTIVE PRODUCTS</span><strong>{activeProducts.length}</strong></div><div><span className="muted">LOW STOCK</span><strong>{lowStock}</strong></div><div><span className="muted">PAID RECENT ORDERS</span><strong>{paidOrders}</strong></div></div>
      {error ? <p className="admin-db-notice">Admin data could not load: {error}</p> : !dashboard ? <p className="admin-db-notice">Loading admin data…</p> : null}</> : <><p className="eyebrow">MASTER MENU / {section.toUpperCase()}</p><h1>{section.charAt(0).toUpperCase() + section.slice(1)}.</h1>{error ? <p className="admin-db-notice">Admin data could not load: {error}</p> : !dashboard ? <p className="admin-db-notice">Loading admin data…</p> : null}</>}

      {(section === 'overview' || section === 'orders') ? <><div className="admin-section-heading"><div><p className="eyebrow">FULFILLMENT</p><h2>{section === 'orders' ? 'Orders' : 'Recent orders'}</h2></div><span className="muted">Last 25 · newest first</span></div>
      <div className="admin-table admin-orders"><div className="admin-table-head"><span>ORDER</span><span>PAYMENT</span><span>FULFILLMENT</span><span>TOTAL</span></div>{orders.length ? orders.map((order) => <div className="admin-order-block" key={order.id}><div className="admin-row"><div><strong>#{order.id.slice(0, 8).toUpperCase()}</strong><span className="muted">{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><span className={`status ${order.payment_status === 'paid' ? 'live' : ''}`}>{order.payment_status.replaceAll('_', ' ')}</span><span className="status">{order.status.replaceAll('_', ' ')}</span><strong>{order.currency} {Number(order.total).toLocaleString('en-IN')}</strong></div><AdminOrderUpdater orderId={order.id} status={order.status} paymentStatus={order.payment_status} /></div>) : <p className="admin-empty">No orders are available.</p>}</div>
      </> : null}

      {(section === 'overview' || section === 'categories') ? <><div className="admin-section-heading inventory-heading"><div><p className="eyebrow">MASTER MENU / TAXONOMY</p><h2>Categories</h2></div><span className="muted">Parent-child hierarchy · archive with optional reassignment</span></div>
      <AdminCategoryManager categories={categories} /></> : null}
      {(section === 'overview' || section === 'products') ? <><div className="admin-section-heading inventory-heading"><div><p className="eyebrow">MASTER MENU / CATALOG</p><h2>Products</h2></div><span className="muted">Create, edit, archive, and restore · max 100 listed</span></div>
      {activeCategories.length ? <AdminCatalogManager products={products} categories={activeCategories} brands={brands} vehicles={vehicles} /> : dashboard ? <p className="admin-db-notice">Create an active category above before adding products.</p> : null}
      </> : null}

      {(section === 'overview' || section === 'inventory') ? <><div className="admin-section-heading inventory-heading"><div><p className="eyebrow">CATALOG / STOCK</p><h2>Inventory watch</h2></div><span className="muted">Available = quantity − reserved</span></div>
      <div className="admin-table"><div className="admin-table-head inventory-table-head"><span>PRODUCT</span><span>STATE</span><span>AVAILABLE</span><span>PRICE</span></div>{activeProducts.length ? activeProducts.map((product) => {
        const inventory = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
        const available = inventory ? inventory.quantity - inventory.reserved : 0;
        const isLow = !inventory || available <= inventory.low_stock_threshold;
        return <div className="admin-row inventory-row" key={product.id}><div><strong>{product.name}</strong><span className="muted">{product.sku}</span></div><span className={`status ${isLow ? 'low-stock' : 'live'}`}>{isLow ? 'LOW / UNSET' : product.status.toUpperCase()}</span><span>{available}{inventory ? ` / ${inventory.quantity}` : ' / not configured'}</span><strong>₹{Number(product.price).toLocaleString('en-IN')}</strong></div>;
      }) : <p className="admin-empty">{dashboard ? 'No active products are available.' : 'Loading inventory…'}</p>}</div></> : null}
    </section>;
}
