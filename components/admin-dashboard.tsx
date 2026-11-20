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
type SalesReport = { summary: { revenue: number; orders: number; units: number; refunds: number }; daily: Array<{ date: string; revenue: number; orders: number }>; categories: Array<{ name: string; units: number; revenue: number }>; products: Array<{ name: string; sku: string; units: number; revenue: number }> };
const money = (value: number) => `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const barWidth = (value: number, max: number) => `${max > 0 ? Math.max(value > 0 ? 4 : 0, Math.min(100, value / max * 100)) : 0}%`;

export function AdminDashboard({ section = 'overview' }: { section?: 'overview' | 'orders' | 'products' | 'categories' | 'inventory' }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [reportError, setReportError] = useState('');

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
    if (section === 'overview') {
      const to = new Date();
      const from = new Date(to.getTime() - 29 * 86_400_000);
      const query = new URLSearchParams({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
      void backendFetch(`/api/admin/reports?${query}`)
        .then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || `Reports API returned ${response.status}.`);
          return payload as { sales?: SalesReport };
        })
        .then((payload) => { if (active) setSales(payload.sales ?? null); })
        .catch((cause: unknown) => { if (active) setReportError(cause instanceof Error ? cause.message : 'Reports unavailable.'); });
    }
    return () => { active = false; };
  }, [section]);

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
  const pendingOrders = orders.filter((order) => order.payment_status === 'pending' || order.status === 'pending').length;
  const daily = sales?.daily.slice(-14) ?? [];
  const dailyMax = Math.max(0, ...daily.map((row) => Number(row.revenue)));
  const categoriesByRevenue = [...(sales?.categories ?? [])].sort((a, b) => Number(b.revenue) - Number(a.revenue)).slice(0, 5);
  const categoryMax = Math.max(0, ...categoriesByRevenue.map((row) => Number(row.revenue)));

  return <section className="admin-shell">
      {section === 'overview' ? <>
        <div className="overview-heading"><div><p className="eyebrow">CONTROL ROOM / LAST 30 DAYS</p><h1>Operations overview.</h1></div><a className="ghost" href="/admin/reports">Full reports →</a></div>
        {error ? <p className="admin-db-notice">Admin data could not load: {error}</p> : null}
        <div className="overview-metrics">
          <article><span>CAPTURED REVENUE</span><strong>{sales ? money(sales.summary.revenue) : '—'}</strong><small>Last 30 days</small></article>
          <article><span>PAID ORDERS</span><strong>{sales?.summary.orders ?? '—'}</strong><small>{pendingOrders} currently pending</small></article>
          <article><span>ACTIVE PRODUCTS</span><strong>{dashboard ? activeProducts.length : '—'}</strong><small>Live in storefront</small></article>
          <article><span>LOW STOCK</span><strong>{dashboard ? lowStock : '—'}</strong><small>At or below threshold</small></article>
        </div>
        {reportError ? <p className="admin-db-notice">Sales report unavailable: {reportError}</p> : null}
        <div className="overview-grid">
          <section className="overview-panel"><div className="overview-panel-heading"><div><p className="eyebrow">SALES REPORT</p><h2>Daily revenue</h2></div><span>14 days</span></div>
            {daily.length ? <div className="overview-bars" role="img" aria-label="Daily revenue for the last 14 days">{daily.map((row) => <div className="overview-bar-column" key={row.date} title={`${row.date}: ${money(Number(row.revenue))}`}><div className="overview-bar-track"><i style={{ height: barWidth(Number(row.revenue), dailyMax) }} /></div><small>{row.date.slice(8)}</small></div>)}</div> : <p className="overview-empty">{sales ? 'No captured sales in this period.' : 'Loading sales report…'}</p>}
            <div className="overview-chart-foot"><span>Revenue</span><strong>{sales ? money(sales.summary.revenue) : '—'}</strong><span>Units sold</span><strong>{sales?.summary.units ?? '—'}</strong></div>
          </section>
          <section className="overview-panel"><div className="overview-panel-heading"><div><p className="eyebrow">SALES REPORT</p><h2>Top categories</h2></div><a href="/admin/reports">Details →</a></div>
            {categoriesByRevenue.length ? categoriesByRevenue.map((row) => <div className="overview-category" key={row.name}><div><span>{row.name}</span><strong>{money(Number(row.revenue))}</strong></div><div className="overview-category-track"><i style={{ width: barWidth(Number(row.revenue), categoryMax) }} /></div></div>) : <p className="overview-empty">{sales ? 'No category sales in this period.' : 'Loading sales report…'}</p>}
          </section>
        </div>
        <section className="overview-actions"><div><p className="eyebrow">QUICK ACTIONS</p><h2>Go to a workspace</h2></div><nav aria-label="Admin quick actions"><a href="/admin/orders">Review orders <b>→</b></a><a href="/admin/products">Manage products <b>→</b></a><a href="/admin/inventory">Update stock <b>→</b></a><a href="/admin/reports">Open reports <b>→</b></a></nav></section>
      </> : <><p className="eyebrow">MASTER MENU / {section.toUpperCase()}</p><h1>{section.charAt(0).toUpperCase() + section.slice(1)}.</h1>{error ? <p className="admin-db-notice">Admin data could not load: {error}</p> : !dashboard ? <p className="admin-db-notice">Loading admin data…</p> : null}</>}

      {section === 'orders' ? <><div className="admin-section-heading"><div><p className="eyebrow">FULFILLMENT</p><h2>Orders</h2></div><span className="muted">Last 25 · newest first</span></div>
      <div className="admin-table admin-orders"><div className="admin-table-head"><span>ORDER</span><span>PAYMENT</span><span>FULFILLMENT</span><span>TOTAL</span></div>{orders.length ? orders.map((order) => <div className="admin-order-block" key={order.id}><div className="admin-row"><div><strong>#{order.id.slice(0, 8).toUpperCase()}</strong><span className="muted">{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><span className={`status ${order.payment_status === 'paid' ? 'live' : ''}`}>{order.payment_status.replaceAll('_', ' ')}</span><span className="status">{order.status.replaceAll('_', ' ')}</span><strong>{order.currency} {Number(order.total).toLocaleString('en-IN')}</strong></div><AdminOrderUpdater orderId={order.id} status={order.status} paymentStatus={order.payment_status} /></div>) : <p className="admin-empty">No orders are available.</p>}</div>
      </> : null}

      {section === 'categories' ? <><div className="admin-section-heading inventory-heading"><div><p className="eyebrow">MASTER MENU / TAXONOMY</p><h2>Categories</h2></div><span className="muted">Parent-child hierarchy · archive with optional reassignment</span></div>
      <AdminCategoryManager categories={categories} /></> : null}
      {section === 'products' ? <><div className="admin-section-heading inventory-heading"><div><p className="eyebrow">MASTER MENU / CATALOG</p><h2>Products</h2></div><span className="muted">Create, edit, archive, and restore · max 100 listed</span></div>
      {activeCategories.length ? <AdminCatalogManager products={products} categories={activeCategories} brands={brands} vehicles={vehicles} /> : dashboard ? <p className="admin-db-notice">Create an active category above before adding products.</p> : null}
      </> : null}

      {section === 'inventory' ? <><div className="admin-section-heading inventory-heading"><div><p className="eyebrow">CATALOG / STOCK</p><h2>Inventory watch</h2></div><span className="muted">Available = quantity − reserved</span></div>
      <div className="admin-table"><div className="admin-table-head inventory-table-head"><span>PRODUCT</span><span>STATE</span><span>AVAILABLE</span><span>PRICE</span></div>{activeProducts.length ? activeProducts.map((product) => {
        const inventory = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
        const available = inventory ? inventory.quantity - inventory.reserved : 0;
        const isLow = !inventory || available <= inventory.low_stock_threshold;
        return <div className="admin-row inventory-row" key={product.id}><div><strong>{product.name}</strong><span className="muted">{product.sku}</span></div><span className={`status ${isLow ? 'low-stock' : 'live'}`}>{isLow ? 'LOW / UNSET' : product.status.toUpperCase()}</span><span>{available}{inventory ? ` / ${inventory.quantity}` : ' / not configured'}</span><strong>₹{Number(product.price).toLocaleString('en-IN')}</strong></div>;
      }) : <p className="admin-empty">{dashboard ? 'No active products are available.' : 'Loading inventory…'}</p>}</div></> : null}
    </section>;
}
