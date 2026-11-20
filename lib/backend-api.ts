import { getSupabaseBrowser } from './supabase';
import { clientBackendPath } from './client-backend-path';

let adminAccessToken: string | null = null;
declare global {
  interface Window { __MODMYRIDE_ADMIN_ACCESS_TOKEN__?: string | null }
}

// The protected admin layout seeds this from its server-verified Supabase
// session. It covers browsers where the SSR cookie exists but browser
// getSession() has not hydrated it yet.
export function setAdminAccessToken(token: string | null) {
  adminAccessToken = token;
  if (typeof window !== 'undefined') window.__MODMYRIDE_ADMIN_ACCESS_TOKEN__ = token;
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  const supabase = getSupabaseBrowser();
  let session = supabase ? (await supabase.auth.getSession()).data.session : null;
  // Admin pages can hydrate before the browser auth client has restored its
  // cookie-backed session. Refresh once on protected requests so the API
  // proxy receives a current bearer token instead of an anonymous request.
  if (!session && supabase && path.startsWith('/api/admin/')) {
    session = (await supabase.auth.refreshSession()).data.session;
  }
  const headers = new Headers(init.headers);
  const accessToken = session?.access_token ?? (typeof window !== 'undefined' ? window.__MODMYRIDE_ADMIN_ACCESS_TOKEN__ : null) ?? adminAccessToken;
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(clientBackendPath(path), {
    ...init,
    headers,
    cache: init.cache ?? 'no-store',
  });
}
