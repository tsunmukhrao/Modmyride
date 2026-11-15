import { describe, expect, it } from 'vitest';
import { reportDateRangeSchema } from './report-validation';

describe('reportDateRangeSchema', () => {
  it('accepts a valid inclusive range up to one year', () => {
    expect(reportDateRangeSchema.safeParse({ from: '2026-01-01', to: '2026-12-31' }).success).toBe(true);
  });

  it('rejects reversed, malformed, and over-one-year ranges', () => {
    expect(reportDateRangeSchema.safeParse({ from: '2026-02-01', to: '2026-01-01' }).success).toBe(false);
    expect(reportDateRangeSchema.safeParse({ from: '2026/01/01', to: '2026-01-20' }).success).toBe(false);
    expect(reportDateRangeSchema.safeParse({ from: '2026-02-30', to: '2026-03-01' }).success).toBe(false);
    expect(reportDateRangeSchema.safeParse({ from: '2025-01-01', to: '2026-02-01' }).success).toBe(false);
  });
});
