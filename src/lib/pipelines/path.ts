/** Path to URL segment helpers (no content rewriting). */

const DOC_EXT = /\.(md|mdx|markdown)$/i;

export function humanizeSegment(seg: string): string {
  return seg
    .replace(/\.markdown$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function titleFromSlug(slugPath: string, segments: string[]): string {
  const leaf = segments[segments.length - 1] ?? slugPath;
  if (!leaf) return 'Overview';
  return humanizeSegment(leaf);
}

/**
 * Parse `.../content/<tech>/.../file.ext` into route segments under that tech.
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
 * YAML frontmatter scalar for `field` (e.g. `description`).
 * Supports single-line values and simple `|` / `>` block scalars (joined with spaces).
 * Returns undefined when missing or empty — not a full YAML parser.
 */
export function yamlFrontmatterField(raw: string, field: string): string | undefined {
  const yaml = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!yaml) return undefined;
  const fm = yaml[1];
  // Escape field for RegExp (ids are plain identifiers in practice).
  const key = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Block: description: |- / | / >-
  //   first line
  //   second line
  const block = fm.match(
    new RegExp(`^${key}:\\s*[|>][-+]?\\s*\\r?\\n((?:[ \\t][^\\r\\n]*\\r?\\n?)*)`, 'm'),
  );
  if (block) {
    const text = block[1]!
      .split(/\r?\n/)
      .map((line) => line.replace(/^[ \t]+/, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text || undefined;
  }

  // Single line: description: "..." | '...' | bare
  const line = fm.match(new RegExp(`^${key}:\\s*(?:["'](.+?)["']|(.+?))\\s*$`, 'm'));
  if (!line) return undefined;
  const v = (line[1] ?? line[2] ?? '').trim();
  // Reject bare block markers if block branch missed (empty body).
  if (!v || /^[|>][-+]?$/.test(v)) return undefined;
  return v;
}

/** Page description from YAML frontmatter `description:` when present. */
export function descriptionFromYamlFrontmatter(raw: string): string | undefined {
  return yamlFrontmatterField(raw, 'description');
}

/**
 * Page title for a doc source file:
 * 1. YAML frontmatter `title:` if set
 * 2. Else if the first non-empty line (after frontmatter) is an ATX H1 (`# ...`),
 *    use that text unless the unslugified file name is longer (e.g. man pages
 *    with `# Name` vs `nix-env`; prefer "Nix Env")
 * 3. Else unslugify the file name (last path segment)
 *
 * Does not scan later headings (avoids a random `#` deeper in the body).
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

/** GitHub-ish slug for heading anchors (no external dep). */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-');
}

/**
 * ATX headings (`#` … `######`) from markdown. Skips fenced ``` / ~~~ blocks.
 * Shape matches DocPage.headings / Astro getHeadings().
 */
export function extractAtxHeadings(
  markdown: string,
): { depth: number; slug: string; text: string }[] {
  const body = stripYamlFrontmatter(markdown);
  const headings: { depth: number; slug: string; text: string }[] = [];
  const seen = new Map<string, number>();
  let fence: string | null = null;

  for (const line of body.split(/\r?\n/)) {
    if (fence) {
      const ch = fence[0]!;
      let n = 0;
      while (n < line.length && line[n] === ch) n++;
      // Close with same marker char, length ≥ open, only trailing whitespace.
      if (n >= fence.length && line.slice(n).trim() === '') fence = null;
      continue;
    }
    const fenceOpen = line.match(/^(`{3,}|~{3,})/);
    if (fenceOpen) {
      fence = fenceOpen[1]!;
      continue;
    }

    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const depth = m[1]!.length;
    // Light inline strip so TOC text is readable (links / emphasis).
    const text = m[2]!
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .trim();
    if (!text) continue;

    let slug = slugifyHeading(text) || 'heading';
    const n = seen.get(slug) ?? 0;
    seen.set(slug, n + 1);
    if (n > 0) slug = `${slug}-${n}`;

    headings.push({ depth, slug, text });
  }

  return headings;
}

/**
 * Make `title` the first ATX H1 in the markdown body (after frontmatter).
 * Replaces an existing leading `# ...` line, or inserts one before the rest.
 * Keeps YAML frontmatter intact when present.
 */
export function ensureLeadingH1Markdown(raw: string, title: string): string {
  const safe = title.replace(/\r?\n/g, ' ').trim() || 'Overview';
  const yaml = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
  const prefix = yaml ? yaml[1] : '';
  let body = yaml ? raw.slice(prefix.length) : raw;

  const lines = body.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === '') i++;

  if (i < lines.length && /^#\s+/.test(lines[i]!.trim()) && !/^##/.test(lines[i]!.trim())) {
    lines[i] = `# ${safe}`;
    body = lines.join('\n');
  } else {
    const rest = body.replace(/^\s*\n/, '');
    body = `# ${safe}\n\n${rest}`;
  }

  return prefix + body;
}
