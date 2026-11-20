import { NextResponse } from 'next/server';
import { forwardToPython } from '../../../lib/python-backend-proxy';
import { getSupabaseServer } from '../../../lib/supabase-server';

async function proxy(request: Request) {
  // Prefer a browser-supplied token. Immediately after sign-in it is the
  // freshest token; the SSR cookie can still be catching up or refreshing.
  const authorization = request.headers.get('authorization');
  let token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  if (!token) {
    try {
      const supabase = await getSupabaseServer();
      if (supabase) await supabase.auth.getUser();
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      token = data.session?.access_token ?? null;
    } catch {
      // Public requests can still be forwarded without a session.
    }
  }
  const response = await forwardToPython(request, process.env.PYTHON_BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_URL, token);
  return new NextResponse(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
