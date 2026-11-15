'use client';

import { useState, type FormEvent } from 'react';

type RequestRecord = { kind: string; status: string; reason: string; created_at: string };

export function OrderRequestActions({ orderId, status, requests = [] }: { orderId: string; status: string; requests?: RequestRecord[] }) {
  const [kind, setKind] = useState<'cancel' | 'return' | ''>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sentKinds, setSentKinds] = useState<string[]>([]);
  const activeKinds = new Set([...requests.filter((request) => ['pending', 'approved'].includes(request.status)).map((request) => request.kind), ...sentKinds]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!kind) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not submit the request.');
      setMessage('Request sent for admin review. Order/payment status has not changed.'); setSentKinds((items) => [...items, kind]); setKind(''); setReason('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit the request.'); }
    finally { setBusy(false); }
  }
  return <div className="order-request-actions">
    {requests.map((request, index) => <span className="muted order-request-status" key={`${request.created_at}-${index}`}>{request.kind} request · {request.status}</span>)}
    {!activeKinds.has('cancel') && ['pending', 'confirmed'].includes(status) && <button className="text-link" type="button" onClick={() => setKind('cancel')}>Request cancellation</button>}
    {!activeKinds.has('return') && status === 'delivered' && <button className="text-link" type="button" onClick={() => setKind('return')}>Request a return</button>}
    {kind && <form className="order-request-form" onSubmit={(event) => void submit(event)}><label>{kind === 'cancel' ? 'Why cancel this order?' : 'Why are you returning this order?'}<textarea value={reason} minLength={5} maxLength={1000} required onChange={(event) => setReason(event.target.value)} /></label><div><button className="button" type="submit" disabled={busy}>{busy ? 'SENDING…' : 'SEND FOR REVIEW'}</button><button className="text-link" type="button" onClick={() => setKind('')}>Keep order</button></div></form>}
    {message && <p role="status" className="muted">{message}</p>}
  </div>;
}
