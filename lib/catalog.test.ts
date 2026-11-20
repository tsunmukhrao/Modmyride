import { describe, expect, it } from 'vitest';
import { ALL_PRODUCTS_PAGE_SIZE, buildKnowledgeText, getSearchSuggestions, products, searchProducts } from './catalog';
import { additionalParts } from './imported-parts';
import { getLocalProductDetail } from './product-detail';

describe('catalog retrieval', () => {
  it('resolves every product by its storefront id or SKU and provides a detail description', () => {
    for (const product of products) {
      expect(getLocalProductDetail(product.id)?.description.trim()).toBeTruthy();
      expect(getLocalProductDetail(product.sku)?.sku).toBe(product.sku);
    }
  });

  it('returns no local detail for an unknown product identifier', () => {
    expect(getLocalProductDetail('not-a-real-product')).toBeNull();
  });

  it('contains 25 fitment-specific products without supplier references', () => {
    expect(additionalParts).toHaveLength(25);
    expect(products).toHaveLength(25);
    expect(additionalParts.every((part) => part.vehicles.length === 1 && part.image && part.sku && !('sourceUrl' in part))).toBe(true);
    expect(searchProducts('Ford EcoSport 7D mats').some((product) => product.sku === 'MMR-AF-151')).toBe(true);
    expect(searchProducts('', { vehicle: 'Mahindra XUV 3XO' }).some((product) => product.sku === 'MMR-AF-162')).toBe(true);
  });
  it('requests enough results to show the complete seeded catalog', () => {
    expect(ALL_PRODUCTS_PAGE_SIZE).toBe(100);
  });

  it('shows useful suggestions even when the typed text has no catalog match', () => {
    expect(getSearchSuggestions('MG', ['Carbon Fiber Front Lip', 'Exterior'], ['Track-ready wheels', 'Cabin lighting'])).toEqual([
      { label: 'Search all for “MG”', query: 'MG' },
      { label: 'Track-ready wheels', query: 'Track-ready wheels' },
      { label: 'Cabin lighting', query: 'Cabin lighting' },
    ]);
  });

  it('finds exact vehicle matches', () => {
    expect(searchProducts('', { vehicle: 'Ford EcoSport' }).some(p => p.vehicles.includes('Ford EcoSport'))).toBe(true);
  });
  it('filters by category and maximum price', () => {
    expect(searchProducts('', { category: 'Interior', maxPrice: 10000 }).length).toBeGreaterThan(0);
  });
  it('builds grounded knowledge text', () => {
    expect(buildKnowledgeText(searchProducts('Ford EcoSport')[0])).toContain('Compatible vehicles:');
  });
  it('extracts a vehicle mention from a natural-language question', () => {
    expect(searchProducts('What fits a Ford EcoSport?').some(p => p.vehicles.includes('Ford EcoSport'))).toBe(true);
  });
  it('supports exact SKU and availability filtering', () => {
    expect(searchProducts('MMR-AF-141')[0].sku).toBe('MMR-AF-141');
    expect(searchProducts('', { inStock: false })).toHaveLength(25);
  });
  it('puts Ford-specific demo parts first for a Ford parts query', () => {
    const results = searchProducts('Ford parts');
    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results.slice(0, 4).every((product) => product.tags.includes('Ford'))).toBe(true);
  });

  it('keeps vehicle-specific products limited to their selected fitment', () => {
    expect(searchProducts('', { vehicle: 'Audi RS5' })).toEqual([]);
    expect(searchProducts('', { vehicle: 'Ford EcoSport' }).every((product) => product.vehicles.includes('Ford EcoSport'))).toBe(true);
  });

  it('uses India vehicle names for explicit product fitment filters', () => {
    expect(searchProducts('', { vehicle: 'Mahindra XUV 3XO' }).some((product) => product.sku === 'MMR-AF-141')).toBe(true);
  });
});
