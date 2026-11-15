import { requireAdmin } from '../../../lib/auth';
import { backendServerFetch } from '../../../lib/backend-api.server';

export const dynamic = 'force-dynamic';

const paymentStatuses = ['pending', 'authorized', 'paid', 'failed', 'partially_refunded', 'refunded'] as const;
type Payment = {
  id: string; order_id: string; provider: string; provider_reference: string | null; provider_payment_id: string | null;
  amount: number; currency: string; status: string; method: string | null; created_at: string;
  refunds: Array<{ amount: number; status: string; reason: string; created_at: string }>;
};
type PageProps = { searchParams: Promise<{ status?: string; from?: string; to?: string }> };

function validDate(value?: string) { return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))); }

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const identity = await requireAdmin();
  const params = await searchParams;
  const status = paymentStatuses.includes(params.status as typeof paymentStatuses[number]) ? params.status : '';
  const from = validDate(params.from) ? params.from : '';
  const to = validDate(params.to) ? params.to : '';
  let payments: Payment[] = [];
  const query = new URLSearchParams();
  if (status) query.set('status', status);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const response = await backendServerFetch(`/api/admin/payments?${query}`);
  const payload = response?.ok ? await response.json() : null;
  const loadError = !payload;
  payments = (payload?.payments ?? []) as Payment[];

  const total = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const failed = payments.filter((payment) => payment.status === 'failed').length;
  const refunded = payments.flatMap((payment) => payment.refunds ?? []).reduce((sum, refund) => sum + (refund.status === 'succeeded' ? Number(refund.amount) : 0), 0);
  const exportParams = new URLSearchParams();
  if (status) exportParams.set('status', status);
  if (from) exportParams.set('from', from);
  if (to) exportParams.set('to', to);
  const exportHref = `/api/admin/payments/export${exportParams.size ? `?${exportParams.toString()}` : ''}`;

  return <main className="account-page">
    <nav className="nav"><a className="brand" href="/admin"><span className="brand-mark">M</span> MODMYRIDE / ADMIN</a><a className="text-link" href="/admin">← Operations</a></nav>
    <section className="admin-shell">
      <p className="eyebrow">CONTROL ROOM / TRANSACTIONS</p><h1>Payment status.</h1><p className="muted">Signed in as {identity.user.email} · gateway webhooks remain the source of truth.</p>
      <form className="payment-filters" method="get"><label>Status<select name="status" defaultValue={status}><option value="">All statuses</option>{paymentStatuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><label>From<input name="from" type="date" defaultValue={from} /></label><label>To<input name="to" type="date" defaultValue={to} /></label><button className="ghost" type="submit">Apply filters</button><a className="button" href={exportHref}>Export CSV ↓</a></form>
      <div className="admin-stats"><div><span className="muted">PAYMENTS SHOWN</span><strong>{payments.length}</strong></div><div><span className="muted">FAILED ATTEMPTS</span><strong>{failed}</strong></div><div><span className="muted">PAYMENT AMOUNT SHOWN</span><strong>₹{total.toLocaleString('en-IN')}</strong></div></div>
      <div className="admin-db-notice">Successful refunds shown: ₹{refunded.toLocaleString('en-IN')}. Refund initiation and manual reconciliation are not enabled here; this screen is read-only.</div>
      {loadError ? <p className="admin-db-notice">Payment data is unavailable. Confirm the commerce migration and Supabase administrator role.</p> : null}
      <div className="admin-section-heading"><div><p className="eyebrow">TRANSACTION LEDGER</p><h2>Latest payments</h2></div><span className="muted">Up to 200 matching rows</span></div>
      <div className="admin-table"><div className="admin-payment-head"><span>ORDER / CREATED</span><span>PROVIDER REFERENCE</span><span>STATUS</span><span>AMOUNT</span></div>{payments.length ? payments.map((payment) => <article className="admin-payment-row" key={payment.id}>
        <div><strong>#{payment.order_id.slice(0, 8).toUpperCase()}</strong><span className="muted">{new Date(payment.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span><span className="muted">{payment.method || payment.provider}</span></div>
        <div><strong>{payment.provider_reference || '—'}</strong><span className="muted">Payment ID: {payment.provider_payment_id || 'awaiting gateway response'}</span></div>
        <span className={`order-pill ${payment.status === 'paid' ? 'delivered' : payment.status === 'failed' ? 'cancelled' : ''}`}>{payment.status.replaceAll('_', ' ')}</span>
        <strong>{payment.currency} {Number(payment.amount).toLocaleString('en-IN')}</strong>
        {payment.refunds?.length ? <div className="admin-refund-summary">{payment.refunds.map((refund, index) => <span key={`${refund.created_at}-${index}`}>Refund {refund.status}: {payment.currency} {Number(refund.amount).toLocaleString('en-IN')} · {refund.reason}</span>)}</div> : null}
      </article>) : <p className="admin-empty">No payments match these filters.</p>}</div>
    </section>
  </main>;
}
