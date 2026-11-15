'use client';

import { useState, type FormEvent } from 'react';

export function ReviewForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: Number(form.get('rating')), title: form.get('title'), body: form.get('body') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit your review.');
      setMessage(data.message || 'Review submitted for moderation.'); formElement.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit your review.'); }
    finally { setBusy(false); }
  }

  return <details className="review-form-wrap"><summary>Write a review</summary><form className="review-form" onSubmit={submit}>
    <label>Rating<select name="rating" defaultValue="5"><option value="5">★★★★★ — Excellent</option><option value="4">★★★★ — Good</option><option value="3">★★★ — Okay</option><option value="2">★★ — Poor</option><option value="1">★ — Bad</option></select></label>
    <label>Title<input name="title" minLength={2} maxLength={120} required /></label>
    <label>Your experience<textarea name="body" minLength={10} maxLength={4000} rows={4} required /></label>
    <button className="button" disabled={busy}>{busy ? 'SUBMITTING…' : 'SUBMIT REVIEW →'}</button>
    {message && <p role="status" className="muted">{message}</p>}
    <p className="muted">Reviews require a delivered order and are moderated before publication.</p>
  </form></details>;
}
