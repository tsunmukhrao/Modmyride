import { describe, expect, it } from 'vitest';
import { parseRecentlyViewed, recordRecentlyViewed } from './recently-viewed';

describe('recently viewed products', () => {
  it('moves a viewed product to the front and limits history to twelve unique IDs', () => {
    const existing = Array.from({ length: 12 }, (_, index) => `p${index}`);
    expect(recordRecentlyViewed(existing, 'p4')).toHaveLength(12);
    expect(recordRecentlyViewed(existing, 'p4').slice(0, 2)).toEqual(['p4', 'p0']);
    expect(recordRecentlyViewed(existing, 'new')[0]).toBe('new');
  });

  it('safely parses malformed or non-string stored values', () => {
    expect(parseRecentlyViewed('{')).toEqual([]);
    expect(parseRecentlyViewed(JSON.stringify(['a', 4, 'a', 'b']))).toEqual(['a', 'b']);
  });
});
