'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { backendFetch } from '../lib/backend-api';

export type EditableCategory = { id: string; name: string; description: string; parent_id: string | null; image_url: string | null; active: boolean; sort_order: number };
type Props = { categories: EditableCategory[] };

function CategoryForm({ categories, category }: { categories: EditableCategory[]; category?: EditableCategory }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const parents = categories.filter((item) => item.active && item.id !== category?.id);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const body = {
      ...(category ? { id: category.id } : {}), name: form.get('name'), description: form.get('description'),
      parentId: form.get('parentId') || null, imageUrl: form.get('imageUrl'), active: form.get('active') === 'true',
      sortOrder: Number(form.get('sortOrder')),
    };
    const response = await backendFetch('/api/admin/categories', { method: category ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(result.error ?? 'Could not save this category.'); return; }
    setMessage('Category saved.');
    router.refresh();
  }

  return <form className="admin-category-form" onSubmit={submit}>
    <label>Name<input name="name" required minLength={2} maxLength={100} defaultValue={category?.name ?? ''} /></label>
    <label>Description<input name="description" maxLength={1000} defaultValue={category?.description ?? ''} /></label>
    <label>Parent<select name="parentId" defaultValue={category?.parent_id ?? ''}><option value="">Top-level category</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label>
    <label>Image URL<input name="imageUrl" type="url" maxLength={1000} defaultValue={category?.image_url ?? ''} placeholder="https://…" /></label>
    <label>Display order<input name="sortOrder" type="number" min="0" max="10000" defaultValue={category?.sort_order ?? categories.length + 1} /></label>
    <label>Visibility<select name="active" defaultValue={category?.active === false ? 'false' : 'true'}><option value="true">Active</option><option value="false">Hidden</option></select></label>
    <div className="admin-category-actions"><button className="ghost" type="submit" disabled={busy}>{busy ? 'Saving…' : category ? 'Save category' : 'Create category +'}</button>{message && <span role="status" className="admin-update-message">{message}</span>}</div>
  </form>;
}

function ArchiveCategory({ categories, category }: { categories: EditableCategory[]; category: EditableCategory }) {
  const router = useRouter();
  const [reassignTo, setReassignTo] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const alternatives = categories.filter((item) => item.active && item.id !== category.id);

  async function archive() {
    if (!window.confirm(`Hide “${category.name}”? If it contains products or child categories, choose a reassignment target first.`)) return;
    setBusy(true);
    setMessage('');
    const response = await backendFetch('/api/admin/categories', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: category.id, ...(reassignTo ? { reassignTo } : {}) }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(result.error ?? 'Could not archive this category.'); return; }
    setMessage('Category archived.');
    router.refresh();
  }

  if (!category.active) return null;
  return <div className="admin-category-archive"><select aria-label={`Reassign ${category.name} contents to`} value={reassignTo} onChange={(event) => setReassignTo(event.target.value)}><option value="">No reassignment</option>{alternatives.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="ghost" type="button" disabled={busy} onClick={archive}>{busy ? 'Working…' : 'Archive'}</button>{message && <span role="status">{message}</span>}</div>;
}

export function AdminCategoryManager({ categories }: Props) {
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return <section className="admin-category-manager" aria-label="Category master menu">
    <details className="admin-category-create"><summary>Create category +</summary><CategoryForm categories={sorted} /></details>
    <div className="admin-table">{sorted.length ? sorted.map((category) => {
      const parent = sorted.find((item) => item.id === category.parent_id);
      return <article className="admin-category-row" key={category.id}><div className="admin-category-heading"><strong>{'— '.repeat(parent ? 1 : 0)}{category.name}</strong><span className={`status ${category.active ? 'live' : ''}`}>{category.active ? 'ACTIVE' : 'HIDDEN'} · ORDER {category.sort_order}</span></div><details className="admin-category-edit"><summary>Edit</summary><CategoryForm categories={sorted} category={category} /></details><ArchiveCategory categories={sorted} category={category} /></article>;
    }) : <p className="admin-empty">No categories found.</p>}</div>
  </section>;
}
