'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type Option = { id: string; name: string };
type Vehicle = { id: string; make: string; model: string; year_from: number | null; year_to: number | null };
export type EditableProduct = {
  id: string; sku: string; name: string; category_id: string | null; brand_id: string | null; description: string;
  price: number; compare_at_price: number | null; tax_rate: number; status: string; tags: string[];
  specifications: Record<string, string>; image: string | null; deleted_at: string | null;
  inventory: { quantity: number; reserved: number; low_stock_threshold: number } | { quantity: number; reserved: number; low_stock_threshold: number }[] | null;
  product_compatibility: { vehicle_id: string; notes: string }[];
  images: EditableProductImage[];
};
export type EditableProductImage = { id: string; storage_path: string; url: string; alt_text: string; sort_order: number };

type Props = { categories: Option[]; brands: Option[]; vehicles: Vehicle[]; product?: EditableProduct; expanded?: boolean };

export function AdminProductEditor({ categories, brands, vehicles, product, expanded = false }: Props) {
  const router = useRouter();
  const inventory = Array.isArray(product?.inventory) ? product.inventory[0] : product?.inventory;
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [compatibility, setCompatibility] = useState<string[]>(product?.product_compatibility.map((fitment) => fitment.vehicle_id) ?? []);
  const productStatus = product?.deleted_at ? 'archived' : product?.status ?? 'draft';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    const form = new FormData(event.currentTarget);
    let specifications: Record<string, string>;
    try { specifications = JSON.parse(String(form.get('specifications') || '{}')); }
    catch { setBusy(false); setFeedback('Specifications must be valid JSON.'); return; }
    const existingFitments = new Map(product?.product_compatibility.map((fitment) => [fitment.vehicle_id, fitment.notes]) ?? []);
    const body = {
      ...(product ? { id: product.id } : {}), sku: form.get('sku'), name: form.get('name'),
      categoryId: form.get('categoryId'), brandId: form.get('brandId') || null,
      description: form.get('description'), price: Number(form.get('price')),
      compareAtPrice: form.get('compareAtPrice') ? Number(form.get('compareAtPrice')) : null,
      taxRate: Number(form.get('taxRate')), status: form.get('status'), quantity: Number(form.get('quantity')),
      lowStockThreshold: Number(form.get('lowStockThreshold')), stockReason: form.get('stockReason'),
      tags: String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      specifications, imageUrl: form.get('imageUrl'),
      compatibility: compatibility.map((vehicleId) => ({ vehicleId, notes: existingFitments.get(vehicleId) ?? '' })),
    };
    const response = await fetch('/api/admin/products', {
      method: product ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setBusy(false); setFeedback(result.error ?? 'Could not save this product.'); return; }
    const productId = product?.id ?? result.productId;
    const files = form.getAll('images').filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.length && productId) {
      const upload = new FormData();
      files.forEach((file) => upload.append('files', file));
      const uploadResponse = await fetch(`/api/admin/products/${productId}/images`, { method: 'POST', body: upload });
      const uploadResult = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) { setBusy(false); setFeedback(`Product saved; image upload failed: ${uploadResult.error ?? 'please try again.'}`); router.refresh(); return; }
    }
    setBusy(false);
    setFeedback('Product saved. Search indexing has been queued.');
    router.refresh();
  }

  async function archive() {
    if (!product || !window.confirm(`Archive ${product.name}? It will disappear from the storefront and can be restored later.`)) return;
    setBusy(true);
    setFeedback('');
    const response = await fetch('/api/admin/products', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: product.id }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setFeedback(result.error ?? 'Could not archive this product.'); return; }
    setFeedback('Product archived. You can restore it by setting its status back to active.');
    router.refresh();
  }

  async function removeImage(imageId: string) {
    if (!product || !window.confirm('Remove this gallery image?')) return;
    setBusy(true);
    setFeedback('');
    const response = await fetch(`/api/admin/products/${product.id}/images`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imageId }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setFeedback(result.error ?? 'Could not remove that image.'); return; }
    setFeedback(result.cleanupPending ? 'Image removed from the gallery; storage cleanup may need retry.' : 'Image removed from the gallery.');
    router.refresh();
  }

  return <details className="admin-product-editor" open={expanded || undefined}><summary>{product ? 'Edit product' : 'Add product +'}</summary><form onSubmit={submit}>
    <div className="admin-product-fields">
      <label>SKU<input name="sku" required minLength={3} maxLength={60} defaultValue={product?.sku ?? ''} /></label>
      <label>Product name<input name="name" required minLength={2} maxLength={180} defaultValue={product?.name ?? ''} /></label>
      <label>Category<select name="categoryId" required defaultValue={product?.category_id ?? ''}><option value="" disabled>Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Brand<select name="brandId" defaultValue={product?.brand_id ?? ''}><option value="">No brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
      <label>Price (₹)<input name="price" type="number" required min="0" step="0.01" defaultValue={product?.price ?? ''} /></label>
      <label>Compare-at price<input name="compareAtPrice" type="number" min="0" step="0.01" defaultValue={product?.compare_at_price ?? ''} /></label>
      <label>Tax rate (%)<input name="taxRate" type="number" required min="0" max="100" step="0.01" defaultValue={product?.tax_rate ?? 18} /></label>
      <label>Status<select name="status" defaultValue={productStatus}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
      <label>Stock quantity<input name="quantity" type="number" required min={inventory?.reserved ?? 0} step="1" defaultValue={inventory?.quantity ?? 0} /></label>
      <label>Low-stock alert at<input name="lowStockThreshold" type="number" required min="0" step="1" defaultValue={inventory?.low_stock_threshold ?? 4} /></label>
      <label>Stock adjustment reason<select name="stockReason" defaultValue={product ? 'correction' : 'initial_stock'}><option value="initial_stock">Initial stock</option><option value="restock">Restock</option><option value="correction">Count correction</option><option value="damage">Damaged stock</option><option value="return">Customer return</option></select></label>
      <label>Image URL<input name="imageUrl" type="url" maxLength={1000} defaultValue={product?.image ?? ''} placeholder="https://…" /></label>
      <label className="admin-product-wide">Description<textarea name="description" rows={3} maxLength={6000} defaultValue={product?.description ?? ''} /></label>
      <label className="admin-product-wide">Tags, comma separated<input name="tags" maxLength={2000} defaultValue={product?.tags?.join(', ') ?? ''} /></label>
      <label className="admin-product-wide">Specifications (JSON)<textarea name="specifications" rows={4} defaultValue={JSON.stringify(product?.specifications ?? {}, null, 2)} /></label>
      <label className="admin-product-wide">Compatible vehicles<select multiple value={compatibility} onChange={(event) => setCompatibility(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.year_from ?? '—'}–{vehicle.year_to ?? 'present'}</option>)}</select><span className="muted">Use Ctrl/⌘ to select multiple vehicles.</span></label>
      <label className="admin-product-wide">Add gallery images<input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple /><span className="muted">Up to six JPEG, PNG, WebP, or AVIF images · 8 MB each.</span></label>
      {product?.images?.length ? <div className="admin-product-wide admin-image-gallery"><span className="admin-gallery-label">Current gallery</span><div>{product.images.map((image) => <figure key={image.id}><img src={image.url} alt={image.alt_text || product.name} /><button className="ghost" type="button" disabled={busy} onClick={() => removeImage(image.id)}>Remove</button></figure>)}</div></div> : null}
    </div>
    <div className="admin-product-actions"><button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : product ? 'Save product →' : 'Create product →'}</button>{product && !product.deleted_at && <button className="ghost" type="button" disabled={busy} onClick={archive}>Archive product</button>}{feedback && <span role="status" className="admin-update-message">{feedback}</span>}</div>
  </form></details>;
}
