import { notFound } from 'next/navigation';
import { SiteHeader } from '../../../components/site-header';
import { ProductPurchase } from '../../../components/product-purchase';
import { ReviewForm } from '../../../components/review-form';
import { RelatedProducts } from '../../../components/related-products';
import { RecentlyViewed } from '../../../components/recently-viewed';
import { ProductBundles } from '../../../components/product-bundles';
import { backendServerFetch } from '../../../lib/backend-api.server';
import type { Product } from '../../../lib/catalog';
import { getLocalProductDetail } from '../../../lib/product-detail';
import './product.css';

export const dynamic = 'force-dynamic';

type ProductDetail = Product & { specifications: Record<string, string>; gallery: string[]; bundles: Array<{ id: string; title: string; description: string; discountPercent: number; subtotal: number; discount: number; total: number; items: Array<{ id: string; name: string; sku: string; image: string; price: number; inStock: boolean; quantity: number; variants: Array<{ id: string; options: Record<string, string>; price: number; inStock: boolean }> }> }>; reviews: Array<{ rating: number; title: string; body: string; createdAt: string }> };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const localProduct = getLocalProductDetail(id);
  const productIdentifier = localProduct?.sku ?? id;
  const response = await backendServerFetch(`/api/products/${encodeURIComponent(productIdentifier)}`);
  const payload = response?.ok ? await response.json() as { product?: ProductDetail } : null;
  const product = payload?.product ?? localProduct;
  const isLiveProduct = Boolean(payload?.product);
  if (!product) notFound();

  const specifications = Object.entries(product.specifications);
  const productVariants = product.variants ?? [];
  const productAvailable = productVariants.length ? productVariants.some((variant) => variant.inStock) : product.inStock;
  return <main className="subpage product-page">
    <SiteHeader />
    <section className="product-detail-shell">
      <a className="text-link" href="/collection">← Back to collection</a>
      <div className="product-detail-grid">
        <div className="product-gallery">
          {product.gallery.length ? product.gallery.map((image, index) => <div className={`product-photo product-photo-${index % 3}`} key={`${image}-${index}`}><img src={image} alt={`${product.name} — view ${index + 1}`} /></div>) : <div className="product-photo product-photo-placeholder"><span>{product.category.toUpperCase()}</span><strong>MOD<br />MY<br />RIDE</strong></div>}
        </div>
        <article className="product-detail-copy">
          <p className="eyebrow">{product.category} / {product.sku}</p>
          <h1>{product.name}</h1>
          <p className="product-detail-brand">{product.brand || 'MODMYRIDE'} {product.rating ? `· ★ ${product.rating.toFixed(1)}` : '· No reviews yet'}</p>
          <div className="product-detail-price"><strong>₹{product.price.toLocaleString('en-IN')}</strong>{product.compareAtPrice && product.compareAtPrice > product.price ? <del>₹{product.compareAtPrice.toLocaleString('en-IN')}</del> : null}</div>
          <p className="product-detail-description">{product.description}</p>
          {isLiveProduct ? <>
            <p className={productAvailable ? 'stock-state available' : 'stock-state'}>{productAvailable ? '● Available to order' : '● Currently out of stock'}</p>
            <ProductPurchase productId={product.id} inStock={product.inStock} variants={product.variants} />
          </> : <p className="stock-state">Preview listing — this item is not yet in the live catalog and cannot be ordered.</p>}
          <div className="product-detail-block"><p className="eyebrow">FITMENT / COMPATIBILITY</p>{product.vehicles.length ? <><ul>{product.vehicles.slice(0, 3).map((vehicle) => <li key={vehicle}>{vehicle}</li>)}</ul>{product.vehicles.length > 3 && <details className="fitment-more"><summary>Show {product.vehicles.length - 3} more compatible vehicles</summary><ul>{product.vehicles.slice(3).map((vehicle) => <li key={vehicle}>{vehicle}</li>)}</ul></details>}</> : <p className="muted">Fitment details are being confirmed. Check with our team before ordering.</p>}</div>
          {specifications.length > 0 && <div className="product-detail-block"><p className="eyebrow">SPECIFICATIONS</p><dl>{specifications.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></div>}
          <div className="product-detail-block"><p className="eyebrow">SHIPPING</p><p className="muted">Delivery options and estimated arrival are confirmed during checkout.</p></div>
          <div className="product-detail-block"><p className="eyebrow">PAYMENT DETAILS</p><p className="muted">Secure payment is handled by the store’s configured payment provider at checkout. Your final total, including applicable taxes and shipping, is shown before you pay. We never store your card details.</p></div>
        </article>
      </div>
      <RelatedProducts productId={product.id} />
      <ProductBundles bundles={product.bundles ?? []} />
      <RecentlyViewed currentProductId={product.id} />
      <section className="product-reviews"><div><p className="eyebrow">CUSTOMER FEEDBACK</p><h2>Reviews {product.rating ? `· ${product.rating.toFixed(1)} / 5` : ''}</h2></div>
        {product.reviews.length ? product.reviews.map((review, index) => <article className="review-card" key={`${review.createdAt}-${index}`}><strong>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}</strong><h3>{review.title}</h3><p>{review.body}</p></article>) : <p className="muted">No approved reviews yet. Reviews are available to verified customers after delivery.</p>}
        <ReviewForm productId={product.id} />
      </section>
    </section>
  </main>;
}
