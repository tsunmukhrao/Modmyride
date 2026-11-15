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

  it('includes at least 50 additional sourced parts across universal and vehicle-specific fitments', () => {
    expect(additionalParts).toHaveLength(50);
    expect(additionalParts.filter((part) => part.tags.includes('universal'))).toHaveLength(25);
    expect(additionalParts.filter((part) => !part.tags.includes('universal'))).toHaveLength(25);
    expect(additionalParts.every((part) => part.sourceUrl && part.image && part.sku)).toBe(true);
    expect(products.filter((product) => product.sku >= 'MMR-AF-115' && product.sku <= 'MMR-AF-164')).toHaveLength(50);
    expect(searchProducts('Universal Magnetic Phone Mount').some((product) => product.sku === 'MMR-AF-115')).toBe(true);
    expect(searchProducts('', { vehicle: 'Mahindra XUV 3XO' }).some((product) => product.sku === 'MMR-AF-151')).toBe(true);
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
    expect(searchProducts('', { category: 'Interior', maxPrice: 10000 }).map(p => p.name)).toEqual(expect.arrayContaining([
      'Ambient LED Cabin Kit',
      'Ford EcoSport All-Weather Floor Mat Set',
      'Ford Mustang Premium Floor Mat Set',
    ]));
  });
  it('builds grounded knowledge text', () => {
    expect(buildKnowledgeText(searchProducts('carbon')[0])).toContain('Compatible vehicles:');
  });
  it('extracts a vehicle mention from a natural-language question', () => {
    expect(searchProducts('What fits a Ford EcoSport?').some(p => p.vehicles.includes('Ford EcoSport'))).toBe(true);
  });
  it('supports exact SKU and availability filtering', () => {
    expect(searchProducts('MMR-INT-002')[0].name).toBe('Ambient LED Cabin Kit');
    expect(searchProducts('', { inStock: false }).map(p => p.sku)).toEqual(['MMR-LGT-004']);
  });
  it('puts Ford-specific demo parts first for a Ford parts query', () => {
    const results = searchProducts('Ford parts');
    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results.slice(0, 4).every((product) => product.tags.includes('Ford'))).toBe(true);
  });

  it('includes source-linked parts for India-market vehicles in the storefront catalog', () => {
    expect(searchProducts('XUV 3XO floor mats').some((product) => product.sourceUrl?.includes('autofurnish.com/products'))).toBe(true);
    expect(searchProducts('Ford EcoSport 7D mats').some((product) => product.sourceUrl?.includes('autofurnish.com/products'))).toBe(true);
    expect(searchProducts('', { vehicle: 'Audi RS5' }).every((product) => product.vehicles.includes('Audi RS5'))).toBe(true);
  });

  it('uses India vehicle names for explicit product fitment filters', () => {
    expect(searchProducts('', { vehicle: 'Audi RS5' }).map((product) => product.sku)).toContain('MMR-WHL-003');
    expect(searchProducts('', { vehicle: 'Audi RS5 · 2016–2022' }).map((product) => product.sku)).toContain('MMR-WHL-003');
    expect(searchProducts('', { vehicle: 'Mahindra XUV 3XO' }).some((product) => product.sku === 'MMR-AF-102')).toBe(true);
  });
});
