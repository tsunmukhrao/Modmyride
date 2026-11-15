import { describe, expect, it } from 'vitest';
import { getDemoProductImage } from './demo-product-images';

describe('demo catalog photos', () => {
  it('returns a photo URL for every seeded product category', () => {
    const categories = ['Interior', 'Exterior', 'Lighting', 'Wheels', 'Wheels & Tyres', 'Audio & Tech', 'Safety & Maintenance', 'Car Care & Utility', 'Performance'];
    for (const category of categories) {
      expect(getDemoProductImage(category)).toMatch(/^https:\/\/images\.pexels\.com\/photos\//);
    }
  });

  it('uses a safe general automotive photo for an unknown category', () => {
    expect(getDemoProductImage('Unlisted')).toContain('images.pexels.com/photos/36903243/');
  });
});
