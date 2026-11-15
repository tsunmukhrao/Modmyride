import type { Product } from './catalog';

export type CatalogSort = 'relevance' | 'price-asc' | 'price-desc' | 'popular' | 'rating' | 'newest';

export type CatalogFilters = {
  query?: string;
  category?: string;
  vehicle?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  inStock?: boolean;
  rating?: number;
  sort?: CatalogSort;
};

export function sortAndFilterProducts(items: Product[], filters: CatalogFilters = {}): Product[] {
  const terms = (filters.query ?? '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = items.filter((product) =>
    (terms.length === 0 || terms.every((term) => [product.name, product.sku, product.description, product.category, product.brand, ...product.tags, ...product.vehicles].join(' ').toLocaleLowerCase().includes(term)))
    && (!filters.category || product.category === filters.category)
    && (!filters.vehicle || product.vehicles.includes(filters.vehicle))
    && (filters.minPrice === undefined || product.price >= filters.minPrice)
    && (filters.maxPrice === undefined || product.price <= filters.maxPrice)
    && (!filters.brand || product.brand?.toLowerCase() === filters.brand.toLowerCase())
    && (filters.inStock === undefined || product.inStock === filters.inStock)
    && (filters.rating === undefined || (product.rating ?? 0) >= filters.rating),
  );

  const byNewest = (a: Product, b: Product) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  const sorters: Record<CatalogSort, (a: Product, b: Product) => number> = {
    relevance: () => 0,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    popular: (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    newest: byNewest,
  };
  return filtered.sort(sorters[filters.sort ?? 'relevance']);
}
