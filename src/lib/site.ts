/** Astro `base` with a trailing slash (`/` or `/subpath/`). */
export function siteBase(): string {
  const base = import.meta.env?.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/** Site-absolute path under `base` (leading slashes on `path` optional). */
export function sitePath(path: string): string {
  return `${siteBase()}${path.replace(/^\/+/, '')}`;
}

/**
 * Pack or page URL: `/docs/:tech/` or `/docs/:tech/:slug/`.
 * `slugPath` is the page's joined segments (no leading/trailing slash).
 */
export function docsPath(tech: string, slugPath = ''): string {
  return slugPath ? sitePath(`docs/${tech}/${slugPath}/`) : sitePath(`docs/${tech}/`);
}
