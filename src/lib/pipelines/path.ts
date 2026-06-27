/** Shared path → URL segment helpers (no content rewriting). */

const DOC_EXT = /\.(md|mdx|markdown)$/i;

export function humanize(slug: string): string {
  return slug
    .replace(/\.markdown$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function humanizeSegment(seg: string): string {
  return humanize(seg);
}

export function titleFromSlug(slugPath: string, segments: string[]): string {
  const leaf = segments[segments.length - 1] ?? slugPath;
  if (!leaf) return 'Overview';
  return humanize(leaf);
}

/**
 * Parse `…/content/<tech>/…/file.ext` into route segments under that tech.
 * Returns null if the path is not a doc file for the given tech (when `tech` is set).
 */
export function parseContentPath(
  path: string,
  techFilter?: string,
): { tech: string; segments: string[]; base: string } | null {
  const marker = '/content/';
  const normalized = path.replace(/\\/g, '/');
  const idx = normalized.indexOf(marker);
  if (idx === -1) return null;
  const rest = normalized.slice(idx + marker.length);
  const parts = rest.split('/');
  const tech = parts[0];
  if (!tech || tech === 'manifest.json') return null;
  if (techFilter && tech !== techFilter) return null;
  const file = parts[parts.length - 1] ?? '';
  if (!DOC_EXT.test(file)) return null;
  const dirParts = parts.slice(1, -1);
  const base = file.replace(DOC_EXT, '');
  const isIndexName = /^(readme|index|summary)$/i.test(base);
  const segments = isIndexName ? [...dirParts] : [...dirParts, base];
  return { tech, segments, base };
}

export function pageOrder(segments: string[], explicit?: number): number {
  if (explicit != null) return explicit;
  return segments.length === 0 ? 0 : 10 + segments.length * 10;
}

export function stripYamlFrontmatter(raw: string): string {
  const yaml = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return yaml ? raw.slice(yaml[0].length) : raw;
}

function titleFromYamlFrontmatter(raw: string): string | undefined {
  const yaml = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!yaml) return undefined;
  const t = yaml[1].match(/^title:\s*["']?(.+?)["']?\s*$/m);
  return t ? t[1].trim() : undefined;
}

/**
 * Page title for a doc source file:
 * 1. YAML frontmatter `title:` if set
 * 2. Else if the first non-empty line (after frontmatter) is an ATX H1 (`# …`),
 *    use that text — unless the unslugified file name is longer (e.g. man pages
 *    with `# Name` vs `nix-env` → prefer "Nix Env")
 * 3. Else unslugify the file name (last path segment)
 *
 * Does not scan later headings — avoids picking a random `#` in the body.
 */
export function titleFromDocSource(raw: string, segments: string[], slugPath = ''): string {
  const fromFm = titleFromYamlFrontmatter(raw);
  if (fromFm) return fromFm;

  const fromSlug = titleFromSlug(slugPath, segments);

  const body = stripYamlFrontmatter(raw);
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Only a single-# ATX heading on that line (not ##)
    const h1 = trimmed.match(/^#\s+(.+?)\s*$/);
    if (h1) {
      const fromH1 = h1[1].trim();
      // Prefer the longer label (unslugified filename wins over terse man "Name")
      return fromSlug.length > fromH1.length ? fromSlug : fromH1;
    }
    break;
  }

  return fromSlug;
}
