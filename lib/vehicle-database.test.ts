import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { indiaVehicles } from './india-vehicles';

describe('India-market vehicle catalog', () => {
  it('includes an expanded India-market catalog with Ford ranked first in the local fallback', () => {
    const records = readFileSync('data/vehicle-database/india-cars.csv', 'utf8').trim().split(/\r?\n/).slice(1);
    expect(records.length).toBeGreaterThanOrEqual(105);
    expect(records[0].startsWith('Ford,')).toBe(true);
    expect(records.some((row) => row.startsWith('Mahindra,XUV 3XO,'))).toBe(true);
    expect(records.some((row) => row.startsWith('Maruti Suzuki,Victoris,'))).toBe(true);
    expect(indiaVehicles).toHaveLength(records.length);
    expect(indiaVehicles[0].make).toBe('Ford');
  });
});
