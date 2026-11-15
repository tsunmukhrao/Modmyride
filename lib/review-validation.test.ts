import { describe, expect, it } from 'vitest';
import { reviewSchema } from './review-validation';

describe('verified purchase review input', () => {
  it('accepts a bounded review with a whole-star rating', () => {
    expect(reviewSchema.safeParse({ rating: 5, title: 'Excellent fit', body: 'Installed cleanly and fits as expected.' }).success).toBe(true);
  });

  it('rejects a fractional or out-of-range rating', () => {
    expect(reviewSchema.safeParse({ rating: 5.5, title: 'Great', body: 'Good product.' }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 0, title: 'Bad', body: 'Not usable.' }).success).toBe(false);
  });

  it('rejects empty review text', () => {
    expect(reviewSchema.safeParse({ rating: 4, title: ' ', body: '' }).success).toBe(false);
  });
});
