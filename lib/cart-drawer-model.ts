import type { CartLine } from './cart';

export type CartProductStatus = { price: number; inStock: boolean; variants?: Array<{ id: string; price: number; inStock: boolean }> };

export function getCartDrawerSummary(lines: CartLine[], products: Record<string, CartProductStatus | undefined>) {
  const subtotal = lines.reduce((sum, line) => {
    const product = products[line.productId];
    const variant = line.variantId ? product?.variants?.find((item) => item.id === line.variantId) : undefined;
    if (line.variantId && !variant) return sum;
    return sum + (variant?.price ?? product?.price ?? 0) * line.quantity;
  }, 0);
  const canCheckout = lines.length > 0 && lines.every((line) => {
    const product = products[line.productId];
    if (line.variantId) return product?.variants?.some((variant) => variant.id === line.variantId && variant.inStock) === true;
    return product?.inStock === true;
  });
  return { subtotal, canCheckout };
}
