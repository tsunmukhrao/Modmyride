import { requireAdmin } from '../../../lib/auth';
import { reportDateRangeSchema } from '../../../lib/report-validation';
import { backendServerFetch } from '../../../lib/backend-api.server';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ from?: string; to?: string }> };
type Sales = { summary: { revenue: number; orders: number; units: number; taxes: number; shipping: number; discounts: number; refunds: number }; daily: Array<{ date: string; revenue: number; orders: number }>; categories: Array<{ name: string; units: number; revenue: number }>; products: Array<{ name: string; sku: string; units: number; revenue: number }> };
type Feedback = { summary: { reviews: number; average_rating: number; one_star: number; two_star: number; five_star: number }; trend: Array<{ week: string; average_rating: number; reviews: number }>; lowest_rated: Array<{ product: string; sku: string; average_rating: number; reviews: number }>; complaint_themes: Array<{ term: string; mentions: number }> };
const amount = (value: number) => `₹${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const width = (value: number, max: number) => `${max > 0 ? Math.max(3, Math.min(100, value / max * 100)) : 0}%`;

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const identity = await requireAdmin();
  const params = await searchParams;
  const now = new Date();
  const defaults = { from: new Date(now.getTime() - 29 * 86_400_000).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  const parsed = reportDateRangeSchema.safeParse({ from: params.from || defaults.from, to: params.to || defaults.to });
  const range = parsed.success ? parsed.data : defaults;
  let sales: Sales | null = null;
  let feedback: Feedback | null = null;
  let loadError = !parsed.success;
  if (parsed.success) {
    const query = new URLSearchParams({ from: range.from, to: range.to });
    const response = await backendServerFetch(`/api/admin/reports?${query}`);
    const result = response?.ok ? await response.json() : null;
    sales = result?.sales as Sales | null;
    feedback = result?.feedback as Feedback | null;
    loadError = !result;
  }
  const exportParams = new URLSearchParams({ from: range.from, to: range.to });
  const dailyMax = Math.max(0, ...(sales?.daily ?? []).map((row) => Number(row.revenue)));
  const categoryMax = Math.max(0, ...(sales?.categories ?? []).map((row) => Number(row.revenue)));
  const trendMax = Math.max(0, ...(feedback?.trend ?? []).map((row) => Number(row.average_rating)));

  return <section className="admin-shell report-shell"><p className="eyebrow">CONTROL ROOM / PERFORMANCE</p><h1>Reports &amp; signals.</h1><p className="muted">Signed in as {identity.user.email} · approved feedback and captured commerce only.</p>
      <form className="payment-filters" method="get"><label>From<input name="from" type="date" required defaultValue={range.from}/></label><label>To<input name="to" type="date" required defaultValue={range.to}/></label><button className="ghost" type="submit">Run reports</button><a className="button" href={`/api/admin/reports/export?${exportParams}&report=sales`}>Sales CSV ↓</a><a className="button" href={`/api/admin/reports/export?${exportParams}&report=feedback`}>Feedback CSV ↓</a></form>
      {!parsed.success ? <p className="admin-db-notice">Choose a valid date range no longer than one year.</p> : null}{loadError ? <p className="admin-db-notice">Report data is unavailable. Apply the admin reports migration and verify the Supabase admin role.</p> : null}
      <div className="admin-section-heading"><div><p className="eyebrow">01 / SALES</p><h2>Revenue, accounted for.</h2></div><span className="muted">{range.from} — {range.to}</span></div>
      <div className="admin-stats report-stats">{[['CAPTURED REVENUE',amount(sales?.summary.revenue ?? 0)],['PAID ORDERS',sales?.summary.orders ?? 0],['UNITS SOLD',sales?.summary.units ?? 0],['REFUNDS',amount(sales?.summary.refunds ?? 0)]].map(([label,value])=><div key={label}><span className="muted">{label}</span><strong>{value}</strong></div>)}</div>
      <div className="report-columns"><section className="report-panel"><p className="eyebrow">DAILY REVENUE</p>{sales?.daily.length ? sales.daily.map((row)=><div className="report-bar-row" key={row.date}><span>{row.date.slice(5)}</span><div className="report-bar-track"><i style={{width:width(Number(row.revenue),dailyMax)}}/></div><strong>{amount(Number(row.revenue))}</strong></div>):<p className="admin-empty">No captured orders in this range.</p>}</section>
        <section className="report-panel"><p className="eyebrow">REVENUE BY CATEGORY</p>{sales?.categories.length ? sales.categories.map((row)=><div className="report-bar-row" key={row.name}><span>{row.name}</span><div className="report-bar-track"><i style={{width:width(Number(row.revenue),categoryMax)}}/></div><strong>{amount(Number(row.revenue))}</strong></div>):<p className="admin-empty">No category sales to report.</p>}</section></div>
      <div className="report-summary-strip"><span>Tax collected <strong>{amount(sales?.summary.taxes ?? 0)}</strong></span><span>Shipping <strong>{amount(sales?.summary.shipping ?? 0)}</strong></span><span>Discounts <strong>{amount(sales?.summary.discounts ?? 0)}</strong></span></div>
      <section className="report-panel report-products"><p className="eyebrow">TOP PRODUCTS / BY SALES</p><div className="report-table-head"><span>PRODUCT</span><span>SKU</span><span>UNITS</span><span>REVENUE</span></div>{sales?.products.length?sales.products.map((row)=><div className="report-table-row" key={row.sku}><strong>{row.name}</strong><span>{row.sku}</span><span>{row.units}</span><strong>{amount(Number(row.revenue))}</strong></div>):<p className="admin-empty">No products sold in this range.</p>}</section>
      <div className="admin-section-heading report-section-gap"><div><p className="eyebrow">02 / CUSTOMER FEEDBACK</p><h2>Listen to the garage.</h2></div><span className="muted">Approved reviews only</span></div>
      <div className="admin-stats report-stats">{[['REVIEWS',feedback?.summary.reviews ?? 0],['AVERAGE RATING',`${Number(feedback?.summary.average_rating ?? 0).toFixed(2)} / 5`],['1–2 STAR REVIEWS',(feedback?.summary.one_star ?? 0)+(feedback?.summary.two_star ?? 0)],['FIVE STAR REVIEWS',feedback?.summary.five_star ?? 0]].map(([label,value])=><div key={label}><span className="muted">{label}</span><strong>{value}</strong></div>)}</div>
      <div className="report-columns"><section className="report-panel"><p className="eyebrow">WEEKLY RATING TREND</p>{feedback?.trend.length?feedback.trend.map((row)=><div className="report-bar-row" key={row.week}><span>{row.week.slice(5)}</span><div className="report-bar-track"><i style={{width:width(Number(row.average_rating),trendMax)}}/></div><strong>{Number(row.average_rating).toFixed(1)} / 5</strong></div>):<p className="admin-empty">No approved reviews in this range.</p>}</section>
        <section className="report-panel"><p className="eyebrow">COMMON LOW-RATING THEMES</p><div className="report-themes">{feedback?.complaint_themes.length?feedback.complaint_themes.map((row)=><span key={row.term}>{row.term}<b>{row.mentions}</b></span>):<p className="admin-empty">No repeated complaint terms yet.</p>}</div></section></div>
      <section className="report-panel report-products"><p className="eyebrow">LOWEST-RATED PRODUCTS</p><div className="report-table-head"><span>PRODUCT</span><span>SKU</span><span>REVIEWS</span><span>AVERAGE</span></div>{feedback?.lowest_rated.length?feedback.lowest_rated.map((row)=><div className="report-table-row" key={row.sku}><strong>{row.product}</strong><span>{row.sku}</span><span>{row.reviews}</span><strong>{Number(row.average_rating).toFixed(2)} / 5</strong></div>):<p className="admin-empty">No approved reviews in this range.</p>}</section>
    </section>;
}
