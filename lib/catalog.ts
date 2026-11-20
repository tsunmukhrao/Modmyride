import { additionalParts } from './imported-parts';
import { indiaVehicles } from './india-vehicles';

export const ALL_PRODUCTS_PAGE_SIZE = 100;

export type Product = {
  id: string; sku: string; name: string; category: string; price: number; image: string;
  description: string; tags: string[]; vehicles: string[]; inStock: boolean;
  brand?: string; rating?: number; popularity?: number; createdAt?: string; compareAtPrice?: number;
  variants?: ProductVariant[];
};

export type ProductVariant = { id: string; sku: string; options: Record<string, string>; price: number; inStock: boolean };

export const products: Product[] = additionalParts;



export type SearchSuggestion = { label: string; query: string };

export function getSearchSuggestions(query: string, candidates: string[], popular: string[], limit = 5): SearchSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const terms = normalized.split(/\s+/).filter((term) => term.length > 1);
  const matches = candidates
    .filter((candidate, index) => candidates.indexOf(candidate) === index)
    .filter((candidate) => {
      const value = candidate.toLowerCase();
      return value.includes(normalized) || terms.some((term) => value.includes(term));
    })
    .slice(0, Math.max(0, limit - 1))
    .map((candidate) => ({ label: candidate, query: candidate }));

  const fallback = matches.length ? [] : popular.slice(0, Math.max(0, limit - 1)).map((item) => ({ label: item, query: item }));
  return [{ label: `Search all for “${query.trim()}”`, query: query.trim() }, ...matches, ...fallback].slice(0, limit);
}

export function searchProducts(query: string, filters: { category?: string; vehicle?: string; minPrice?: number; maxPrice?: number; inStock?: boolean } = {}) {
  const q = query.trim().toLowerCase();
  const detectedVehicle = indiaVehicles.find(({ make, model }) => q.includes(`${make} ${model}`.toLowerCase()));
  const vehicle = filters.vehicle?.split(' · ')[0] ?? (detectedVehicle ? `${detectedVehicle.make} ${detectedVehicle.model}` : undefined);
  return products
    .filter((p) => !filters.category || p.category === filters.category)
    .filter((p) => !vehicle || p.vehicles.some((name) => name.toLowerCase() === vehicle.toLowerCase()))
    .filter((p) => filters.minPrice === undefined || p.price >= filters.minPrice)
    .filter((p) => !filters.maxPrice || p.price <= filters.maxPrice)
    .filter((p) => filters.inStock === undefined || p.inStock === filters.inStock)
    .map((p) => ({ product: p, score: q ? [p.sku, p.name, p.category, p.description, ...p.tags, ...p.vehicles].join(' ').toLowerCase().includes(q) || q.split(/\s+/).some((token) => token.length > 3 && [p.sku, p.name, p.category, p.description, ...p.tags, ...p.vehicles].join(' ').toLowerCase().includes(token)) ? 2 : 0 : 1 }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

export function buildKnowledgeText(product: Product) {
  return `${product.name} (${product.sku}). Category: ${product.category}. ${product.description} Compatible vehicles: ${product.vehicles.join(', ')}. Tags: ${product.tags.join(', ')}. Availability: ${product.inStock ? 'in stock' : 'out of stock'}.`;
}
