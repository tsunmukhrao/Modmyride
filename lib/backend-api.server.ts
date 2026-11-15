import 'server-only';
import { normalizeBackendOrigin } from './python-backend-proxy';
import { getSupabaseServer } from './supabase-server';

export async function backendServerFetch(path: string, init: RequestInit = {}) {
  const origin = normalizeBackendOrigin(process.env.PYTHON_BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_URL);
  if (!origin) return null;
  const supabase = await getSupabaseServer();
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  try {
    return await fetch(new URL(path.startsWith('/') ? path : `/${path}`, origin), { ...init, headers, cache: 'no-store' });
  } catch {
    return null;
  }
}
