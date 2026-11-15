import { describe, expect, it, vi } from 'vitest';
import { forwardToPython } from './python-backend-proxy';

describe('Python API proxy', () => {
  it('forwards API method, query, body, and verified session bearer token', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response('{"ok":true}', { status: 201 }));
    const request = new Request('http://store.test/api/admin/products?draft=1', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'private=cookie' }, body: '{"name":"part"}' });
    const response = await forwardToPython(request, 'http://127.0.0.1:8000', 'access-token', fetcher);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe('http://127.0.0.1:8000/api/admin/products?draft=1');
    expect(init?.method).toBe('POST');
    expect(init?.redirect).toBe('follow');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer access-token');
    expect(new Headers(init?.headers).get('cookie')).toBeNull();
    expect(await new Response(init?.body).text()).toBe('{"name":"part"}');
    expect(response.status).toBe(201);
  });

  it('fails closed if the Python API origin is not configured', async () => {
    const response = await forwardToPython(new Request('http://store.test/api/search'), '', null);
    expect(response.status).toBe(503);
  });

  it('accepts Render private hostport references and uses HTTP internally', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request) => new Response('{"ok":true}', { status: 200 }));
    await forwardToPython(new Request('http://store.test/api/health'), 'modmyride-api:10000', null, fetcher);
    expect(String(fetcher.mock.calls[0][0])).toBe('http://modmyride-api:10000/api/health');
  });
});
