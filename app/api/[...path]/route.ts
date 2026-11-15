import { NextResponse } from 'next/server';
import { forwardToPython } from '../../../lib/python-backend-proxy';
import { getSupabaseServer } from '../../../lib/supabase-server';

async function proxy(request: Request) {
  let token: string | null = null;
  try {
    const supabase = await getSupabaseServer();
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    token = data.session?.access_token ?? null;
  } catch {
    // Public requests can still be forwarded without a session.
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
