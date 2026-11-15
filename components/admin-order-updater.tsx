'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { orderId: string; status: string; paymentStatus: string };

function nextStatuses(status: string, paymentStatus: string) {
  if (status === 'pending') return paymentStatus === 'paid' ? ['confirmed', 'cancelled'] : ['cancelled'];
  if (status === 'confirmed') return ['packed', 'cancelled'];
  if (status === 'packed') return ['shipped', 'cancelled'];
  if (status === 'shipped') return ['out_for_delivery'];
  if (status === 'out_for_delivery') return ['delivered'];
  return [status];
}

export function AdminOrderUpdater({ orderId, status, paymentStatus }: Props) {
  const router = useRouter();
  const options = nextStatuses(status, paymentStatus);
  const [nextStatus, setNextStatus] = useState(options[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status: nextStatus,
        courier: form.get('courier'),
        trackingNumber: form.get('trackingNumber'),
        trackingUrl: form.get('trackingUrl'),
        eta: form.get('eta') ? new Date(String(form.get('eta'))).toISOString() : '',
      }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(result.error ?? 'Could not update this order.'); return; }
    setMessage('Fulfillment update saved.');
    router.refresh();
  }

  return <details className="admin-order-editor"><summary>Update fulfillment / tracking</summary><form onSubmit={submit}>
    <label>Status<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label>
    <label>Courier<input name="courier" maxLength={120} placeholder="e.g. Blue Dart" /></label>
    <label>Tracking number<input name="trackingNumber" maxLength={160} placeholder="Required when shipping" /></label>
    <label>Tracking URL<input name="trackingUrl" type="url" placeholder="https://…" /></label>
    <label>ETA<input name="eta" type="date" /></label>
    <button className="ghost" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save update →'}</button>
    {message && <span className="admin-update-message" role="status">{message}</span>}
  </form></details>;
}
