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

/** Doxygen / pandoc-style trailing `{#anchor}` (common in OpenCV manuals). */
function stripHeadingAnchor(text: string): string {
  return text.replace(/\s*\{#[\w.:-]+\}\s*$/, '').trim();
}

/**
 * CommonMark setext underline: one or more `=` (H1) or `-` (H2), optional
 * trailing spaces only. Caller ensures the previous line is non-empty text.
 */
function setextDepth(underline: string): 1 | 2 | null {
  if (/^=+\s*$/.test(underline) && underline.trim().length > 0) return 1;
  if (/^-+\s*$/.test(underline) && underline.trim().length > 0) return 2;
  return null;
}

/** Light inline strip so TOC / title text is readable (links, emphasis, anchors). */
function cleanHeadingText(raw: string): string {
  return stripHeadingAnchor(
    raw
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .trim(),
  );
}

/**
 * Page title for a doc source file:
 * 1. YAML frontmatter `title:` if set
 * 2. Else if the first non-empty block (after frontmatter) is an ATX H1 (`# …`)
 *    or setext H1 (`text` + `===`), use that text unless the unslugified file
 *    name is longer (e.g. man pages with `# Name` vs `nix-env`; prefer "Nix Env")
 * 3. Else unslugify the file name (last path segment)
 *
 * Does not scan later headings (avoids a random `#` deeper in the body).
 */
export function titleFromDocSource(raw: string, segments: string[], slugPath = ''): string {
  const fromFm = titleFromYamlFrontmatter(raw);
  if (fromFm) return fromFm;

  const fromSlug = titleFromSlug(slugPath, segments);

  const body = stripYamlFrontmatter(raw);
  const lines = body.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === '') i++;
  if (i >= lines.length) return fromSlug;

  const first = lines[i]!.trim();
  // ATX H1 only (not ##)
  const atx = first.match(/^#\s+(.+?)\s*$/);
  if (atx) {
    const fromH1 = cleanHeadingText(atx[1]!);
    if (!fromH1) return fromSlug;
    return fromSlug.length > fromH1.length ? fromSlug : fromH1;
  }

  // Setext H1: text line + === underline (OpenCV / Doxygen manuals)
  if (i + 1 < lines.length && setextDepth(lines[i + 1]!) === 1 && !/^#{1,6}\s/.test(first)) {
    const fromH1 = cleanHeadingText(first);
    if (fromH1) {
      return fromSlug.length > fromH1.length ? fromSlug : fromH1;
    }
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
 * ATX (`#` … `######`) and setext (underlined) headings from markdown.
 * Skips fenced ``` / ~~~ blocks. Shape matches DocPage.headings / Astro getHeadings().
 */
export function extractAtxHeadings(
  markdown: string,
): { depth: number; slug: string; text: string }[] {
  const body = stripYamlFrontmatter(markdown);
  const headings: { depth: number; slug: string; text: string }[] = [];
  const seen = new Map<string, number>();
  let fence: string | null = null;
  const lines = body.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
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

    // Setext: non-empty text + underline of = (H1) or - (H2).
    // When previous line has text, `---` is setext H2 (not a thematic break).
    if (i + 1 < lines.length) {
      const depth = setextDepth(lines[i + 1]!);
      const textLine = line.trim();
      if (
        depth &&
        textLine &&
        !/^#{1,6}\s/.test(textLine) &&
        !/^(`{3,}|~{3,})/.test(textLine)
      ) {
        const text = cleanHeadingText(textLine);
        if (text) {
          let slug = slugifyHeading(text) || 'heading';
          const n = seen.get(slug) ?? 0;
          seen.set(slug, n + 1);
          if (n > 0) slug = `${slug}-${n}`;
          headings.push({ depth, slug, text });
        }
        i++; // consume underline
        continue;
      }
    }

    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const depth = m[1]!.length;
    const text = cleanHeadingText(m[2]!);
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
 * Replaces a leading ATX H1 or setext H1, or inserts one before the rest.
 * Keeps YAML frontmatter intact when present.
 *
 * Replacing setext (not stacking an ATX H1 above it) avoids duplicate titles on
 * OpenCV-style manuals after title extraction.
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
  } else if (
    i + 1 < lines.length &&
    setextDepth(lines[i + 1]!) === 1 &&
    lines[i]!.trim() &&
    !/^#{1,6}\s/.test(lines[i]!.trim())
  ) {
    // Convert leading setext H1 → single ATX H1 (drop underline).
    lines[i] = `# ${safe}`;
    lines.splice(i + 1, 1);
    body = lines.join('\n');
  } else {
    const rest = body.replace(/^\s*\n/, '');
    body = `# ${safe}\n\n${rest}`;
  }

  return prefix + body;
}
