export type CartLine = { productId: string; variantId?: string; quantity: number };
import type { Product } from './catalog';
const MAX_QUANTITY = 50;

export function normalizeCartLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const lines = new Map<string, CartLine>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.productId !== 'string' || !candidate.productId.trim()) continue;
    const quantity = Number(candidate.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const productId = candidate.productId.trim();
    const variantId = typeof candidate.variantId === 'string' && candidate.variantId.trim() ? candidate.variantId.trim() : undefined;
    const key = `${productId}::${variantId ?? ''}`;
    const previous = lines.get(key);
    lines.set(key, { productId, ...(variantId ? { variantId } : {}), quantity: Math.min(MAX_QUANTITY, (previous?.quantity ?? 0) + Math.floor(quantity)) });
  }
  return [...lines.values()];
}

export function setCartQuantity(lines: CartLine[], productId: string, quantity: number, variantId?: string): CartLine[] {
  const matches = (line: CartLine) => line.productId === productId && line.variantId === variantId;
  if (!Number.isFinite(quantity) || quantity <= 0) return lines.filter((line) => !matches(line));
  const safeQuantity = Math.min(MAX_QUANTITY, Math.floor(quantity));
  let found = false;
  const updated = lines.map((line) => {
    if (!matches(line)) return line;
    if (found) return { ...line, quantity: 0 };
    found = true;
    return { ...line, quantity: safeQuantity };
  });
  if (!found) updated.push({ productId, ...(variantId ? { variantId } : {}), quantity: safeQuantity });
  return normalizeCartLines(updated);
}

export function mergeCartLines(localLines: CartLine[], accountLines: CartLine[]): CartLine[] {
  return normalizeCartLines([...accountLines, ...localLines]);
}

export function getCartItemCount(lines: CartLine[]) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function getCartLineProduct(product: Product | undefined, line: CartLine): { price: number; inStock: boolean; options?: Record<string, string> } | undefined {
  if (!product) return undefined;
  if (!line.variantId) return { price: product.price, inStock: product.inStock };
  const variant = product.variants?.find((item) => item.id === line.variantId);
  return variant ? { price: variant.price, inStock: variant.inStock, options: variant.options } : undefined;
}
