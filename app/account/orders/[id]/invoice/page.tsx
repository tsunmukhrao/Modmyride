import { notFound, redirect } from 'next/navigation';
import { InvoicePrintButton } from '../../../../../components/invoice-print-button';
import { getCurrentIdentity } from '../../../../../lib/auth';
import { backendServerFetch } from '../../../../../lib/backend-api.server';
import '../../../invoice.css';

type InvoiceData = {
  id: string; status: string; payment_status: string; subtotal: number; discount_total: number;
  tax_total: number; shipping_total: number; total: number; currency: string; created_at: string;
  shipping: Record<string, string>; isDemoTaxAndShipping: boolean;
  items: Array<{ id: string; quantity: number; unit_price: number; product_snapshot: { name?: string; sku?: string; options?: Record<string, string> } }>;
  payments: Array<{ provider: string; status: string; amount: number; currency: string; provider_payment_id?: string }>;
};

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  if (!await getCurrentIdentity()) redirect('/account?next=%2Faccount');
  const { id } = await params;
  const response = await backendServerFetch(`/api/orders/${encodeURIComponent(id)}/invoice`);
  if (!response || response.status === 404) notFound();
  if (!response.ok) return <main className="invoice-page"><p>Invoice is temporarily unavailable. Please try again from your account.</p></main>;
  const { invoice } = await response.json() as { invoice: InvoiceData };
  const address = invoice.shipping ?? {};
  const money = (value: number) => `${invoice.currency} ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  return <main className="invoice-page"><header className="invoice-toolbar no-print"><a href="/account">← GARAGE / ORDERS</a><InvoicePrintButton /></header><article className="invoice-sheet">
    <div className="invoice-top"><div><p className="eyebrow">MODMYRIDE / TAX INVOICE</p><h1>Order invoice.</h1><p>Invoice reference · {invoice.id.toUpperCase()}</p></div><div className="invoice-status"><strong>{invoice.payment_status.replaceAll('_', ' ').toUpperCase()}</strong><span>{new Date(invoice.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span></div></div>
    <div className="invoice-address"><div><p className="eyebrow">DELIVER TO</p><strong>{address.recipient || 'Customer'}</strong><span>{address.line1}</span>{address.line2 && <span>{address.line2}</span>}<span>{[address.city, address.region, address.postalCode].filter(Boolean).join(', ')}</span><span>{address.countryCode || 'IN'}</span></div><div><p className="eyebrow">ORDER STATUS</p><strong>{invoice.status.replaceAll('_', ' ')}</strong><span>Payment: {invoice.payment_status.replaceAll('_', ' ')}</span>{invoice.payments.map((p, i) => <span key={`${p.provider}-${i}`}>{p.provider} · {p.status}{p.provider_payment_id ? ` · ${p.provider_payment_id}` : ''}</span>)}</div></div>
    <table className="invoice-items"><thead><tr><th>ITEM</th><th>QTY</th><th>UNIT</th><th>AMOUNT</th></tr></thead><tbody>{invoice.items.map((item) => <tr key={item.id}><td><strong>{item.product_snapshot?.name || 'Automotive part'}</strong><small>{item.product_snapshot?.sku || ''} {Object.values(item.product_snapshot?.options || {}).join(' · ')}</small></td><td>{item.quantity}</td><td>{money(item.unit_price)}</td><td>{money(item.unit_price * item.quantity)}</td></tr>)}</tbody></table>
    <div className="invoice-totals"><p><span>Subtotal</span><strong>{money(invoice.subtotal)}</strong></p><p><span>Discount</span><strong>− {money(invoice.discount_total)}</strong></p><p><span>Tax</span><strong>{money(invoice.tax_total)}</strong></p><p><span>Shipping</span><strong>{money(invoice.shipping_total)}</strong></p><p className="invoice-grand"><span>Total paid / due</span><strong>{money(invoice.total)}</strong></p></div>
    {invoice.isDemoTaxAndShipping && <p className="invoice-demo-note">DEMO PROJECT DOCUMENT — tax and delivery charges are sample calculations, not a statutory tax invoice or carrier quote.</p>}
  </article></main>;
}
