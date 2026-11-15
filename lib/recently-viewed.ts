const RECENTLY_VIEWED_LIMIT = 12;

export function parseRecentlyViewed(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((item): item is string => typeof item === 'string' && item.length > 0))].slice(0, RECENTLY_VIEWED_LIMIT);
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(existing: string[], productId: string): string[] {
  if (!productId) return existing.slice(0, RECENTLY_VIEWED_LIMIT);
  return [productId, ...existing.filter((id) => id !== productId)].slice(0, RECENTLY_VIEWED_LIMIT);
}
