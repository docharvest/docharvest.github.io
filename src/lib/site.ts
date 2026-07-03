/** Astro `base` with a trailing slash (`/` or `/subpath/`). */
export function siteBase(): string {
  const base = import.meta.env?.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/** Site-absolute path under `base` (leading slashes on `path` optional). */
export function sitePath(path: string): string {
  return `${siteBase()}${path.replace(/^\/+/, '')}`;
}
