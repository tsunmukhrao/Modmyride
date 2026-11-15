import { describe, expect, it } from 'vitest';
import { buildCollectionSearchHref, readCollectionSearchQuery } from './search-url';

describe('collection search URLs', () => {
  it('encodes a typed query for the collection page', () => {
    expect(buildCollectionSearchHref('Mustang GT spoiler')).toBe('/collection?q=Mustang+GT+spoiler');
  });

  it('returns the initial query from the collection URL', () => {
    expect(readCollectionSearchQuery('?q=Mustang+GT')).toBe('Mustang GT');
    expect(readCollectionSearchQuery('')).toBe('');
  });
});
