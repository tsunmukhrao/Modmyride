'use client';

import { useEffect, useState } from 'react';

const DEMO_WINDOW_SECONDS = 10 * 60;

function createSession() {
  return globalThis.crypto?.randomUUID?.().replaceAll('-', '') ?? `${Date.now()}demoqr`;
}

export function DemoUpiQr({ amount }: { amount: number }) {
  const [session, setSession] = useState('');
  const [remaining, setRemaining] = useState(DEMO_WINDOW_SECONDS);
  const [expiresAt, setExpiresAt] = useState(0);

  function refresh() {
    setSession(createSession());
    setRemaining(DEMO_WINDOW_SECONDS);
    setExpiresAt(Date.now() + DEMO_WINDOW_SECONDS * 1000);
  }

  useEffect(() => {
    if (!expiresAt) {
      setSession(createSession());
      setRemaining(DEMO_WINDOW_SECONDS);
      setExpiresAt(Date.now() + DEMO_WINDOW_SECONDS * 1000);
      return;
    }
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const qrUrl = session && remaining > 0
    ? `/api/payments/demo-qr?amount_minor=${Math.max(1, Math.round(amount * 100))}&session=${encodeURIComponent(session)}`
    : '';
  const timeLabel = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return <section className="demo-upi-card" aria-label="Demo QR checkout">
    <p className="eyebrow">UPI CHECKOUT PREVIEW</p>
    {!session ? <div className="demo-upi-loading" style={{ width: 'min(100%, 210px)', aspectRatio: '1', display: 'grid', placeItems: 'center' }}>Generating demo QR…</div> : remaining > 0 ? <img className="demo-upi-qr" src={qrUrl} alt="Demo QR code. It does not contain a UPI recipient and cannot accept payment." /> : <div className="demo-upi-expired">Demo QR expired</div>}
    <strong>₹{amount.toLocaleString('en-IN')}</strong>
    <p className={`demo-upi-timer ${remaining === 0 ? 'demo-upi-expired' : ''}`} role="timer" aria-live="off">{remaining ? `QR expires in ${timeLabel}` : 'QR expired'}</p>
    <p>This is a generated demo QR only. No merchant UPI ID is set, it cannot accept money, and scanning it will not place or confirm an order.</p>
    {remaining === 0 && <button className="demo-upi-refresh" type="button" onClick={refresh}>Generate a fresh demo QR</button>}
  </section>;
}
