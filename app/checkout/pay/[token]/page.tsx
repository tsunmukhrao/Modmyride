'use client';

import { use, useEffect, useState } from 'react';
import { backendFetch } from '../../../../lib/backend-api';
import '../../checkout.css';

type PaymentInfo = { amount: number; currency: string; expiresAt: number };

export default function DemoPayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [message, setMessage] = useState('Loading secure demo checkout…');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void backendFetch(`/api/payments/demo/${encodeURIComponent(token)}`).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'This payment link is invalid or expired.');
      if (active) { setInfo(data); setMessage('Demo only. No money will be charged.'); }
    }).catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Payment link unavailable.'); });
    return () => { active = false; };
  }, [token]);
  async function pay() {
    setBusy(true); setMessage('Recording demo payment…');
    try {
      const response = await backendFetch(`/api/payments/demo/${encodeURIComponent(token)}/pay`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not record demo payment.');
      setMessage(`Demo payment recorded for order ${String(data.orderId).slice(0, 8).toUpperCase()}. No money was charged.`);
      setInfo(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Payment failed.'); }
    finally { setBusy(false); }
  }
  return <main className="account-page checkout-page"><section className="checkout-shell demo-pay-shell"><p className="eyebrow">MODMYRIDE / DEMO PAYMENT</p><h1>Complete demo<br />payment.</h1><div className="account-card demo-pay-card">{info && <h2>{info.currency} {(info.amount / 100).toLocaleString('en-IN')}</h2>}<p role="status">{message}</p>{info && Math.floor(Date.now() / 1000) < info.expiresAt && <button className="button" type="button" disabled={busy} onClick={() => void pay()}>{busy ? 'PROCESSING…' : 'PAY'}</button>}</div></section></main>;
}
