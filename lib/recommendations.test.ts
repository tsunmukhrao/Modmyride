import { describe, expect, it } from 'vitest';
import { rankRelatedProducts } from './recommendations';
import type { Product } from './catalog';

const product = (id: string, category: string, vehicles: string[]): Product => ({
  id, sku: id, name: id, category, price: 1, image: '', description: '', tags: [], vehicles, inStock: true,
});

describe('product category recommendations', () => {
  it('prefers products in the same category and compatible vehicles', () => {
    const current = product('current', 'Wheels', ['BMW M4']);
    const ranked = rankRelatedProducts(current, [
      product('other-category', 'Interior', ['BMW M4']),
      product('same-category-wrong-vehicle', 'Wheels', ['Audi RS5']),
      product('same-category-compatible', 'Wheels', ['BMW M4']),
    ]);
    expect(ranked.map(({ id }) => id)).toEqual(['same-category-compatible', 'same-category-wrong-vehicle', 'other-category']);
  });

  it('excludes the current item', () => {
    const current = product('current', 'Exterior', []);
    expect(rankRelatedProducts(current, [current])).toEqual([]);
  });
});
