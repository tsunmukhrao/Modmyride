'use client';

import { useState, type FormEvent } from 'react';
import { backendFetch } from '../lib/backend-api';
import { SignOutButton } from './sign-out-button';

type Props = { fullName: string; phone: string; email: string };

export function CustomerProfileEditor({ fullName, phone, email }: Props) {
  const [name, setName] = useState(fullName);
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(''); setError(false);
    try {
      const response = await backendFetch('/api/account/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, phone: phoneNumber }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Could not save your profile.');
      setName(result.profile.full_name); setPhoneNumber(result.profile.phone);
      setEditing(false); setMessage('Profile saved.');
    } catch (cause) {
      setError(true); setMessage(cause instanceof Error ? cause.message : 'Could not save your profile.');
    } finally { setBusy(false); }
  }

  return <section className="account-card customer-profile" aria-labelledby="profile-heading">
    <div className="customer-profile-heading"><div><p className="eyebrow">ACCOUNT DETAILS</p><h2 id="profile-heading">Your profile</h2></div><span className="profile-avatar" aria-hidden="true">{(name || email).trim().charAt(0).toUpperCase()}</span></div>
    {!editing ? <>
      <dl className="profile-details"><div><dt>Full name</dt><dd>{name || 'Add your name'}</dd></div><div><dt>Email</dt><dd>{email}<small>Email address is managed by your sign-in provider.</small></dd></div><div><dt>Phone</dt><dd>{phoneNumber || 'Add a phone number'}</dd></div></dl>
      <div className="profile-actions"><button className="button" type="button" onClick={() => { setMessage(''); setEditing(true); }}>Edit profile</button><SignOutButton /></div>
    </> : <form className="profile-form" onSubmit={save}>
      <label>Full name<input autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Phone number<input type="tel" autoComplete="tel" required minLength={8} maxLength={20} placeholder="+91…" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} /><small>Include your country code, for example +91.</small></label>
      <div className="profile-actions"><button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button><button className="ghost" type="button" disabled={busy} onClick={() => { setName(fullName); setPhoneNumber(phone); setEditing(false); setMessage(''); }}>Cancel</button></div>
    </form>}
    {message && <p className={`profile-message${error ? ' error' : ''}`} role={error ? 'alert' : 'status'}>{message}</p>}
  </section>;
}
