import { describe, expect, it } from 'vitest';
import { products } from './catalog';
import { sortAndFilterProducts } from './catalog-discovery';

describe('catalog discovery', () => {
  it('composes price, brand, stock, and rating filters', () => {
    expect(sortAndFilterProducts(products, { minPrice: 1000, maxPrice: 5000, brand: 'Ford', inStock: true, rating: 4 }))
      .toEqual([]);
  });

  it('sorts results by price in both directions', () => {
    const ascending = sortAndFilterProducts(products, { sort: 'price-asc' });
    const descending = sortAndFilterProducts(products, { sort: 'price-desc' });
    expect(ascending[0].price).toBeLessThanOrEqual(ascending[1].price);
    expect(descending[0].price).toBeGreaterThanOrEqual(descending[1].price);
  });

  it('sorts by popularity and rating without mutating the source products', () => {
    const original = [...products];
    const popular = sortAndFilterProducts(products, { sort: 'popular' });
    const rated = sortAndFilterProducts(products, { sort: 'rating' });
    expect(popular[0].popularity).toBeGreaterThanOrEqual(popular[1].popularity ?? 0);
    expect(rated[0].rating ?? 0).toBeGreaterThanOrEqual(rated[1].rating ?? 0);
    expect(products).toEqual(original);
  });

  it('searches product names, SKUs, descriptions, tags, and fitment locally', () => {
    expect(sortAndFilterProducts(products, { query: 'wiper' }).map((product) => product.id)).toEqual(expect.arrayContaining([
      'ford-figo-aspire-wipers',
      'import-autofurnish-mmr-af-146',
    ]));
  });
});
