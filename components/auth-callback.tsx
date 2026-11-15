'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '../lib/supabase';
import { safeReturnPath } from '../lib/safe-return-path';

export function AuthCallback({ code, next }: { code: string; next: string }) {
  const [message, setMessage] = useState('Confirming your secure sign-in…');
  const router = useRouter();
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowser();
    if (!supabase || !code) { setMessage('This sign-in link is invalid or expired.'); return; }
    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!active) return;
      if (error) { setMessage('This sign-in link is invalid or expired.'); return; }
      router.replace(safeReturnPath(next) ?? '/'); router.refresh();
    });
    return () => { active = false; };
  }, [code, next, router]);
  return <main className="account-page"><section className="account-shell"><p className="eyebrow">MODMYRIDE / SECURE ACCOUNT</p><h1>{message}</h1><a className="text-link" href="/account">Return to sign in</a></section></main>;
}
