'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { SiteHeader } from '../../components/site-header';
import { useCart } from '../../components/cart-provider';
import type { Product } from '../../lib/catalog';
import { getCartLineProduct } from '../../lib/cart';
import { backendFetch } from '../../lib/backend-api';
import { getPaymentGateway } from '../../lib/payment-gateways';
import { DemoUpiQr } from '../../components/demo-upi-qr';
import './checkout.css';

type Shipping = { recipient: string; phone: string; line1: string; line2: string; city: string; region: string; postalCode: string; countryCode: string };
type PaymentSetup = { provider: string; reference: string; amount: number; currency: string; checkoutUrl: string | null; clientData: Record<string, string> };
type ActiveOrder = { orderId: string; status: string; payment: PaymentSetup; summary?: { subtotal: number; discount: number; tax: number; shipping: number; total: number; currency: string } };
type ShippingEstimate = { amount: number; etaMinDays: number; etaMaxDays: number; isDemo: boolean; method: string };

const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function CheckoutPage() {
  const { lines, ready, clear, remove } = useCart();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'demo_upi' | 'cash_on_delivery' | ''>('');
  const [shippingEstimate, setShippingEstimate] = useState<ShippingEstimate | null>(null);
  const [estimateBusy, setEstimateBusy] = useState(false);
  const [estimateError, setEstimateError] = useState('');
  const shippingRef = useRef<Shipping | null>(null);
  const idempotencyKey = useRef('');

  useEffect(() => {
    if (!ready) return;
    let active = true;
    Promise.all(lines.map(async ({ productId }) => {
      try {
        const response = await backendFetch(`/api/products/${encodeURIComponent(productId)}`);
        if (!response.ok) return null;
        const data = await response.json() as { product?: Product };
        return data.product ? [productId, data.product] as const : null;
      } catch { return null; }
    })).then((items) => { if (active) setProducts(Object.fromEntries(items.filter((item): item is NonNullable<typeof item> => Boolean(item)))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lines, ready]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + (getCartLineProduct(products[line.productId], line)?.price ?? 0) * line.quantity, 0), [lines, products]);
  const invalidLines = lines.some((line) => !getCartLineProduct(products[line.productId], line)?.inStock);

  async function estimateDelivery() {
    setEstimateBusy(true); setEstimateError(''); setShippingEstimate(null);
    try {
      const response = await backendFetch('/api/shipping/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postalCode, items: lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Enter a valid six-digit Indian PIN code.');
      setShippingEstimate(data as ShippingEstimate);
    } catch (caught) {
      setEstimateError(caught instanceof Error ? caught.message : 'Delivery estimate is unavailable.');
    } finally { setEstimateBusy(false); }
  }

  async function confirmPayment(internalOrderId: string, provider: string, providerReference: string, response: Record<string, string>) {
    setPaymentNotice('Checking the signed payment response…');
    const verification = await backendFetch('/api/payments/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, internalOrderId, providerReference, payload: response }),
    });
    if (!verification.ok) {
      const result = await verification.json().catch(() => ({}));
      setError(result.error || 'We could not verify the payment response. Contact support before retrying.');
      return;
    }
    setPaymentNotice('Payment response verified. Waiting for the gateway webhook to confirm capture…');
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await pause(2000);
      const statusResponse = await backendFetch(`/api/orders/${encodeURIComponent(internalOrderId)}`, { cache: 'no-store' });
      if (!statusResponse.ok) continue;
      const status = await statusResponse.json() as { order?: { payment_status?: string; status?: string } };
      if (status.order?.payment_status === 'paid') {
        clear(); setPaymentConfirmed(true); setPaymentNotice('Payment captured and order confirmed.'); return;
      }
      if (status.order?.payment_status === 'failed') {
        setPaymentNotice('The payment attempt failed. Your order remains available for another secure attempt.'); return;
      }
    }
    setPaymentNotice('Payment confirmation is still pending. You can check your order status in your account.');
  }

  async function openGateway(order: ActiveOrder) {
    const gateway = getPaymentGateway(order.payment.provider);
    if (gateway) {
      try {
        await gateway.open(order.payment, (payload) => { void confirmPayment(order.orderId, order.payment.provider, order.payment.reference, payload); });
      } catch {
        setError('The configured payment gateway could not be opened. Please try again.');
      }
      return;
    }
    if (order.payment.checkoutUrl) {
      window.location.assign(order.payment.checkoutUrl);
      return;
    }
    setError(`The ${order.payment.provider} checkout adapter is not installed in this storefront.`);
  }

  async function startOrder(shipping: Shipping, method: 'demo_upi' | 'cash_on_delivery') {
    if (!lines.length) return;
    setBusy(true); setError(''); setAuthRequired(false); setPaymentNotice('');
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    try {
      const response = await backendFetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })), shipping, paymentMethod: method, idempotencyKey: idempotencyKey.current }),
      });
      const data = await response.json();
      if (response.status === 401) { setAuthRequired(true); return; }
      if (!response.ok) throw new Error(data.error || 'We could not start checkout.');
      const nextOrder = data as ActiveOrder;
      setActiveOrder(nextOrder);
      if (method === 'cash_on_delivery') { clear(); setPaymentNotice('Order placed. Payment is due on delivery.'); }
      else setPaymentNotice('Scan the QR to open the one-button demo payment page.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not place your order. Please try again.');
      // A new idempotency key is needed only when the server has canceled the failed setup.
      if (/reserved stock was released|Payment provider is unavailable/i.test(caught instanceof Error ? caught.message : '')) idempotencyKey.current = '';
    } finally { setBusy(false); }
  }

  function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[1-9][0-9]{5}$/.test(postalCode)) {
      setError('Enter a valid six-digit Indian PIN code.');
      return;
    }
    setError('');
    const form = new FormData(event.currentTarget);
    const shipping: Shipping = {
      recipient: String(form.get('recipient') ?? ''), phone: String(form.get('phone') ?? ''),
      line1: String(form.get('line1') ?? ''), line2: String(form.get('line2') ?? ''),
      city: String(form.get('city') ?? ''), region: String(form.get('region') ?? ''),
      postalCode: String(form.get('postalCode') ?? ''), countryCode: 'IN',
    };
    if (!paymentMethod) { setError('Choose a payment method to continue.'); return; }
    shippingRef.current = shipping;
    void startOrder(shipping, paymentMethod);
  }

  return <main className="account-page checkout-page">
    <SiteHeader /><section className="checkout-shell">
      <p className="eyebrow">BUILD / SECURE CHECKOUT</p>
      {paymentConfirmed ? <><h1>Payment confirmed.</h1><div className="success-card"><p>Your order is paid and confirmed. Track its progress from your account.</p><a className="button" href="/account">View orders →</a></div></> : activeOrder ? <>
        <h1>Finish your<br />payment.</h1>
        <div className="checkout-grid"><div className="account-card"><p className="eyebrow">ORDER / {activeOrder.orderId.slice(0, 8).toUpperCase()}</p><h2>{activeOrder.payment.currency} {(activeOrder.payment.amount / 100).toLocaleString('en-IN')}</h2><p className="muted">{activeOrder.payment.provider === 'demo_upi' ? 'Demo payment only. No money is charged.' : 'Cash on delivery selected.'}</p>{paymentNotice && <p className="checkout-feedback" role="status">{paymentNotice}</p>}{error && <p className="checkout-error" role="alert">{error}</p>}{activeOrder.payment.provider === 'demo_upi' && activeOrder.payment.clientData.demoToken && <DemoUpiQr token={activeOrder.payment.clientData.demoToken} amount={activeOrder.payment.amount / 100} expiresAt={Number(activeOrder.payment.clientData.expiresAt)} />}<a className="text-link" href="/account">Check account orders</a></div><aside className="account-card"><p className="eyebrow">SERVER-CALCULATED ORDER TOTAL</p>{activeOrder.summary && <div className="order-breakdown"><p><span>Subtotal</span><strong>₹{activeOrder.summary.subtotal.toLocaleString('en-IN')}</strong></p><p><span>Discount</span><strong>− ₹{activeOrder.summary.discount.toLocaleString('en-IN')}</strong></p><p><span>Tax</span><strong>₹{activeOrder.summary.tax.toLocaleString('en-IN')}</strong></p><p><span>Shipping</span><strong>₹{activeOrder.summary.shipping.toLocaleString('en-IN')}</strong></p></div>}<h3>{activeOrder.payment.currency} {(activeOrder.payment.amount / 100).toLocaleString('en-IN')}</h3><p className="muted">{activeOrder.payment.provider.replaceAll('_', ' ')}</p><a className="text-link" href={`/account/orders/${encodeURIComponent(activeOrder.orderId)}/invoice`}>View invoice →</a></aside></div>
      </> : <>
        <h1>Ready for the road.</h1>
        {loading ? <p className="muted">Rechecking the cart…</p> : !lines.length ? <div className="success-card"><p>Your cart is empty.</p><a className="button" href="/collection">Explore the collection →</a></div> : <form className="checkout-grid" onSubmit={submitAddress}>
          <div className="account-card checkout-address"><p className="eyebrow">DELIVERY ADDRESS</p><div className="checkout-fields"><label>Recipient<input name="recipient" autoComplete="name" required minLength={2} maxLength={120} /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" required minLength={8} maxLength={20} /></label><label className="field-wide">Address line 1<input name="line1" autoComplete="address-line1" required minLength={3} maxLength={180} /></label><label className="field-wide">Address line 2 <span className="muted">optional</span><input name="line2" autoComplete="address-line2" maxLength={180} /></label><label>City<input name="city" autoComplete="address-level2" required /></label><label>State / region<input name="region" autoComplete="address-level1" required /></label><label>PIN code<input name="postalCode" type="text" inputMode="numeric" autoComplete="postal-code" required minLength={6} maxLength={6} pattern="[1-9][0-9]{5}" placeholder="6-digit Indian PIN" value={postalCode} aria-describedby="checkout-pin-help" onChange={(event) => { const digits = event.target.value.replace(/\D/g, '').slice(0, 6); setPostalCode(digits); setShippingEstimate(null); }} /></label><p id="checkout-pin-help" className="pin-help">Enter your six-digit delivery PIN. Starts with 1–9.</p></div><fieldset className="payment-methods"><legend>PAYMENT METHOD</legend><label><input type="radio" name="paymentMethod" value="demo_upi" checked={paymentMethod === 'demo_upi'} onChange={() => setPaymentMethod('demo_upi')} /><span><b>Demo UPI QR</b><small>Test checkout · no charge</small></span></label><label><input type="radio" name="paymentMethod" value="cash_on_delivery" checked={paymentMethod === 'cash_on_delivery'} onChange={() => setPaymentMethod('cash_on_delivery')} /><span><b>Cash on delivery</b><small>Pay when your order arrives</small></span></label></fieldset><div className="shipping-estimate"><button className="ghost account-action" type="button" disabled={estimateBusy || !/^[1-9][0-9]{5}$/.test(postalCode) || !lines.length} onClick={() => void estimateDelivery()}>{estimateBusy ? 'CHECKING…' : 'ESTIMATE DELIVERY'}</button>{shippingEstimate && <p role="status">{shippingEstimate.method} · ₹{shippingEstimate.amount} · {shippingEstimate.etaMinDays}–{shippingEstimate.etaMaxDays} days <small>DEMO ESTIMATE — confirmed total is calculated at order placement.</small></p>}{estimateError && <p className="checkout-error" role="alert">{estimateError}</p>}</div>{authRequired && <p className="checkout-error">Sign in is required before ordering. Your cart is saved in this browser. <a href="/account?next=%2Fcheckout">Sign in →</a></p>}{error && <p className="checkout-error" role="alert">{error}</p>}<button className="button" type="submit" disabled={busy || loading || invalidLines || !paymentMethod}>{busy ? 'SETTING UP CHECKOUT…' : 'PLACE ORDER →'}</button>{invalidLines && <p className="muted">Remove unavailable items or update your cart before checkout.</p>}</div>
          <aside className="account-card checkout-summary"><p className="eyebrow">ORDER SUMMARY</p>{lines.map((line) => { const product = products[line.productId]; const selected = getCartLineProduct(product, line); return <div className="checkout-item" key={`${line.productId}-${line.variantId ?? 'base'}`}><span>{product?.name ?? 'Unavailable product'}{line.variantId ? ` / ${Object.values(selected?.options ?? {}).join(' / ')}` : ''} × {line.quantity}</span>{selected ? <strong>₹{(selected.price * line.quantity).toLocaleString('en-IN')}</strong> : <button className="text-link" type="button" onClick={() => remove(line.productId, line.variantId)}>Remove</button>}</div>; })}{invalidLines && <p className="checkout-error">An item could not be matched to the live catalog or is out of stock. Remove it to continue; preview listings are not orderable.</p>}<div className="checkout-total"><span>Current subtotal</span><strong>₹{subtotal.toLocaleString('en-IN')}</strong></div><p className="muted">Taxes, coupons, inventory, and final payable amount are recalculated securely by the server.</p></aside>
        </form>}
      </>}
    </section></main>;
}
