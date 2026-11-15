import type { Product } from './catalog';

export function rankRelatedProducts(current: Product, candidates: Product[]) {
  const vehicleSet = new Set(current.vehicles.map((vehicle) => vehicle.toLocaleLowerCase()));
  return candidates
    .filter((candidate) => candidate.id !== current.id)
    .map((candidate) => ({
      product: candidate,
      score: (candidate.category.toLocaleLowerCase() === current.category.toLocaleLowerCase() ? 4 : 0)
        + candidate.vehicles.filter((vehicle) => vehicleSet.has(vehicle.toLocaleLowerCase())).length * 2
        + (candidate.inStock ? 0.25 : 0)
        + Math.log1p(candidate.popularity ?? 0) / 100,
    }))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .map(({ product }) => product);
}
