import { describe, expect, it } from 'vitest';
import { findVehicleByKey, vehicleOptionValue, type VehicleOption } from './vehicle-options';

describe('collection vehicle filter options', () => {
  const vehicles: VehicleOption[] = [
    { make: 'Maruti Suzuki', model: 'Grand Vitara', yearStart: 2022, yearEnd: null },
    { make: 'Ford', model: 'EcoSport', yearStart: 2013, yearEnd: 2021 },
  ];

  it('creates distinct option keys for vehicle generations', () => {
    expect(vehicleOptionValue(vehicles[0])).toBe('Maruti Suzuki::Grand Vitara::2022::');
  });

  it('preserves complete multiword makes and models for the search API', () => {
    const selected = findVehicleByKey(vehicles, vehicleOptionValue(vehicles[0]));
    expect(selected).toEqual({ make: 'Maruti Suzuki', model: 'Grand Vitara' });
  });
});
