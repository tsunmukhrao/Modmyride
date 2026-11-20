'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '../lib/supabase';
import { loginSchema, passwordUpdateSchema, registrationSchema, resetSchema } from '../lib/auth-validation';
import { safeReturnPath } from '../lib/safe-return-path';

type Mode = 'signin' | 'register' | 'reset' | 'recovery';

function authErrorMessage(error: { message: string; status?: number; code?: string }, action: 'signin' | 'register' | 'reset' | 'recovery') {
  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? '';
  if (code === 'over_email_send_rate_limit' || message.includes('email rate limit')) {
    return 'Supabase has temporarily blocked confirmation emails because this project reached its email limit. Stop retrying for now; configure custom SMTP in Supabase Auth, then try again.';
  }
  if (code === 'email_address_not_authorized' || message.includes('email address not authorized')) {
    return 'Supabase’s built-in mailer only sends to authorized team addresses. Configure custom SMTP in Supabase Auth to send confirmation and reset emails to customers.';
  }
  if (error.status === 429 || message.includes('rate limit') || message.includes('too many')) {
    return action === 'signin'
      ? 'Supabase temporarily rate-limited sign-in attempts. Wait a few minutes before trying again.'
      : 'Supabase temporarily rate-limited this request. Wait before retrying; repeated clicks will extend the problem.';
  }
  if (message.includes('already registered') || message.includes('user already exists')) {
    return 'An account may already exist for this email. Try signing in or use “Forgot password?”';
  }
  if (message.includes('not confirmed')) {
    return 'This account exists but its email is not confirmed. Check your inbox for the confirmation link.';
  }
  if (action === 'signin' && (message.includes('invalid login credentials') || message.includes('invalid credentials'))) {
    return 'Email or password is incorrect. Check both fields or use “Forgot password?”';
  }
  return error.message || 'Authentication failed. Please try again.';
}

export function AuthForm({ initialMode = 'signin', notice = '', redirectTo = '/' }: { initialMode?: Mode; notice?: string; redirectTo?: string }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const supabase = getSupabaseBrowser();
    if (!supabase) { setError('Authentication is not configured. Add the Supabase URL and anon key.'); setPending(false); return; }
    try {
      if (mode === 'signin') {
        const parsed = loginSchema.safeParse({ email: form.get('email'), password: form.get('password') });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Check your details.');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword(parsed.data);
        if (authError) {
          throw new Error(authErrorMessage(authError, 'signin'));
        }
        if (!authData.session) throw new Error('Supabase did not create a session. Check the project’s email confirmation settings.');
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();
        router.replace(profile?.role === 'admin' ? '/admin' : safeReturnPath(redirectTo) ?? '/'); router.refresh(); return;
      }
      if (mode === 'register') {
        const parsed = registrationSchema.safeParse({ name: form.get('name'), phone: form.get('phone'), email: form.get('email'), password: form.get('password') });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Check your details.');
        const siteUrl = window.location.origin;
        const { data, error: authError } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { full_name: parsed.data.name, phone: parsed.data.phone }, emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeReturnPath(redirectTo) ?? '/account')}` } });
        if (authError) throw new Error(authErrorMessage(authError, 'register'));
        if (data.session) { router.replace(safeReturnPath(redirectTo) ?? '/'); router.refresh(); return; }
        setMessage('Check your email for a confirmation link to activate your account.');
      } else if (mode === 'reset') {
        const parsed = resetSchema.safeParse({ email: form.get('email') });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Enter a valid email.');
        const { error: authError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/account?mode=recovery')}` });
        if (authError) throw new Error(authErrorMessage(authError, 'reset'));
        setMessage('If that email has an account, a password reset link is on its way.');
      } else {
        const parsed = passwordUpdateSchema.safeParse({ password: form.get('password'), confirmPassword: form.get('confirmPassword') });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Check the new password.');
        const { error: authError } = await supabase.auth.updateUser({ password: parsed.data.password });
        if (authError) throw new Error(authErrorMessage(authError, 'recovery'));
        router.replace('/account'); router.refresh(); return;
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Authentication failed.'); }
    finally { setPending(false); }
  }

  return <section className="auth-card" aria-labelledby="auth-title">
    <p className="eyebrow">MODMYRIDE / SECURE ACCOUNT</p>
    <h2 id="auth-title">{mode === 'signin' ? 'Welcome back.' : mode === 'register' ? 'Join the garage.' : mode === 'recovery' ? 'Choose a new password.' : 'Reset your password.'}</h2>
    <p className="auth-intro">{mode === 'signin' ? 'Sign in to manage your vehicles, builds, and orders.' : mode === 'register' ? 'Create one account for fitment, checkout, and order tracking.' : mode === 'recovery' ? 'Choose a new password for your account.' : 'We’ll email you a secure link to choose a new password.'}</p>
    <form onSubmit={submit} className="auth-fields">
      {(mode === 'signin' || mode === 'register') && <input type="hidden" name="next" value={redirectTo} />}
      {mode === 'register' && <>
        <label>Full name<input name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} /></label>
        <label>Phone<input name="phone" type="tel" autoComplete="tel" placeholder="+91…" required /></label>
      </>}
      {(mode === 'signin' || mode === 'register' || mode === 'reset') && <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
      {(mode === 'signin' || mode === 'register') && <label>Password<input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={mode === 'signin' ? 1 : 10} maxLength={128} /></label>}
      {mode === 'recovery' && <>
        <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /></label>
        <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /></label>
      </>}
      {(mode === 'register' || mode === 'recovery') && <p className="auth-hint">At least 10 characters, including uppercase, lowercase, a number, and a symbol.</p>}
      {error && <p className="auth-feedback error" role="alert">{error}</p>}
      {message && <p className="auth-feedback" role="status">{message}</p>}
      {!error && !message && notice && <p className="auth-feedback" role="status">{notice}</p>}
      <button className="button auth-submit" disabled={pending}>{pending ? 'PLEASE WAIT…' : mode === 'signin' ? 'Sign in →' : mode === 'register' ? 'Create account →' : mode === 'recovery' ? 'Update password →' : 'Send reset link →'}</button>
    </form>
    <div className="auth-switches">
      {mode === 'signin' && <><button type="button" onClick={() => setMode('reset')}>Forgot password?</button><button type="button" onClick={() => setMode('register')}>Create account</button></>}
      {mode === 'register' && <button type="button" onClick={() => setMode('signin')}>Already have an account? Sign in</button>}
      {mode === 'reset' && <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>}
      {mode === 'recovery' && <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>}
    </div>
  </section>;
}
