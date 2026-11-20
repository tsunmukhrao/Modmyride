'use client';

import { useEffect, useState } from 'react';

export function DemoUpiQr({ token, amount, expiresAt }: { token: string; amount: number; expiresAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(0, expiresAt - Math.floor(Date.now() / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  const timeLabel = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return <section className="demo-upi-card" aria-label="Demo QR checkout">
    <p className="eyebrow">DEMO UPI CHECKOUT</p>
    {remaining ? <img className="demo-upi-qr" src={`/api/payments/demo-qr?token=${encodeURIComponent(token)}`} alt="Scan to open the demo payment page." /> : <div className="demo-upi-expired">Demo link expired</div>}
    <strong>₹{amount.toLocaleString('en-IN')}</strong>
    <p className="demo-upi-timer" role="timer" aria-live="off">{remaining ? `Expires in ${timeLabel}` : 'Link expired'}</p>
    <p>Demo only. Scanning opens a page with a Pay button; it records a test order payment and does not charge money.</p>
  </section>;
}
