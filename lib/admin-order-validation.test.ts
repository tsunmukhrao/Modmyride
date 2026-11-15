import { describe, expect, it } from 'vitest';
import { adminOrderUpdateSchema } from './admin-order-validation';

describe('adminOrderUpdateSchema', () => {
  it('accepts a shipping update with courier tracking and ETA', () => {
    const parsed = adminOrderUpdateSchema.safeParse({
      status: 'shipped', courier: 'Blue Dart', trackingNumber: 'BD123456',
      trackingUrl: 'https://track.example/BD123456', eta: '2026-12-01T12:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects shipping without a tracking number', () => {
    const parsed = adminOrderUpdateSchema.safeParse({ status: 'shipped', courier: 'Blue Dart' });
    expect(parsed.success).toBe(false);
  });

  it('rejects unsafe tracking URLs and unknown statuses', () => {
    expect(adminOrderUpdateSchema.safeParse({ status: 'shipped', trackingNumber: '123', trackingUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(adminOrderUpdateSchema.safeParse({ status: 'processing' }).success).toBe(false);
  });
});
