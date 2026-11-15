import { describe, expect, it } from 'vitest';
import { clientBackendPath } from './client-backend-path';

describe('same-origin Python API path', () => {
  it('keeps existing API paths under the Next.js proxy', () => {
    expect(clientBackendPath('/api/orders')).toBe('/api/orders');
  });

  it('adds the proxy prefix when callers pass an unprefixed path', () => {
    expect(clientBackendPath('/orders/abc')).toBe('/api/orders/abc');
  });
});
