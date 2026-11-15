export function buildCollectionSearchHref(query: string) {
  const params = new URLSearchParams();
  params.set('q', query.trim());
  return `/collection?${params.toString()}`;
}

export function readCollectionSearchQuery(search: string) {
  return new URLSearchParams(search).get('q')?.trim() ?? '';
}
