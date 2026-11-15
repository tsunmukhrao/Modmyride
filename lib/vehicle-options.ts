export type VehicleOption = {
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number | null;
};

export function vehicleOptionValue(vehicle: VehicleOption): string {
  return `${vehicle.make}::${vehicle.model}::${vehicle.yearStart}::${vehicle.yearEnd ?? ''}`;
}

export function findVehicleByKey(vehicles: VehicleOption[], key: string): { make: string; model: string } | undefined {
  const vehicle = vehicles.find((item) => vehicleOptionValue(item) === key);
  return vehicle ? { make: vehicle.make, model: vehicle.model } : undefined;
}

export function vehicleOptionLabel(vehicle: VehicleOption): string {
  const years = `${vehicle.yearStart}–${vehicle.yearEnd ?? 'present'}`;
  return `${vehicle.make} ${vehicle.model} · ${years}`;
}
