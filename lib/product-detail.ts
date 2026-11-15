import { products, type Product } from './catalog';

export type LocalProductDetail = Product & {
  gallery: string[];
  specifications: Record<string, string>;
  bundles: [];
  reviews: [];
};

export function getLocalProductDetail(identifier: string): LocalProductDetail | null {
  const normalized = identifier.trim().toLocaleLowerCase();
  if (!normalized) return null;

  const product = products.find((item) =>
    item.id.toLocaleLowerCase() === normalized || item.sku.toLocaleLowerCase() === normalized,
  );
  if (!product) return null;

  return {
    ...product,
    description: product.description.trim() || `${product.name} is a ${product.category.toLowerCase()} accessory. Confirm fitment and specifications for your vehicle before purchase.`,
    gallery: product.image ? [product.image] : [],
    specifications: {},
    bundles: [],
    reviews: [],
  };
}
