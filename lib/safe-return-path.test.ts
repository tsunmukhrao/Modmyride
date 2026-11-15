import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './safe-return-path';

describe('safe post-auth return paths', () => {
  it('preserves same-site routes and query parameters', () => {
    expect(safeReturnPath('/checkout?from=cart')).toBe('/checkout?from=cart');
  });

  it('rejects absolute and protocol-relative redirects', () => {
    expect(safeReturnPath('https://evil.example')).toBeNull();
    expect(safeReturnPath('//evil.example')).toBeNull();
    expect(safeReturnPath('/\\evil.example')).toBeNull();
  });
});
