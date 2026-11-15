type Fetcher = typeof fetch;

export function normalizeBackendOrigin(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const candidate = raw.includes('://') ? raw : `http://${raw}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export async function forwardToPython(
  request: Request,
  backendOrigin: string | undefined,
  accessToken: string | null,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  const backend = normalizeBackendOrigin(backendOrigin);
  if (!backend) {
    return Response.json({ error: 'Python backend is not configured.' }, { status: 503 });
  }

  const incoming = new URL(request.url);
  backend.pathname = `${backend.pathname.replace(/\/$/, '')}${incoming.pathname}`;
  backend.search = incoming.search;
  const headers = new Headers(request.headers);
  for (const name of ['host', 'cookie', 'content-length', 'connection']) headers.delete(name);
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
  try {
    const upstream = await fetcher(backend, { method, headers, body, redirect: 'follow', cache: 'no-store' });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ['content-encoding', 'content-length', 'transfer-encoding', 'connection']) responseHeaders.delete(name);
    return new Response(method === 'HEAD' || upstream.status === 204 || upstream.status === 304 ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: 'Python backend is unavailable.' }, { status: 502 });
  }
}
