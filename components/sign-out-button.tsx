'use client';

import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '../lib/supabase';

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  }
  return <button className="button" type="button" onClick={() => void signOut()}>Sign out →</button>;
}
