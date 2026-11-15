import { getSupabaseBrowser } from './supabase';
import { clientBackendPath } from './client-backend-path';

export async function backendFetch(path: string, init: RequestInit = {}) {
  const supabase = getSupabaseBrowser();
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(clientBackendPath(path), {
    ...init,
    headers,
    cache: init.cache ?? 'no-store',
  });
}
