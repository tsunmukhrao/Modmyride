export function clientBackendPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.startsWith('/api/') ? normalized : `/api${normalized}`;
}
