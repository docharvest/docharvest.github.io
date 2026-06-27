import { marked } from 'marked';
import manifestJson from '../../content/manifest.json';

export type DocPack = {
  id: string;
  title: string;
  description: string;
  source: string;
  repo: string;
};

export type DocPage = {
  tech: string;
  segments: string[];
  slugPath: string;
  title: string;
  description: string;
  order: number;
  Content: unknown | null;
  html: string | null;
  headings: { depth: number; slug: string; text: string }[];
  filePath: string;
};

type MdModule = {
  frontmatter: {
    title?: string;
    description?: string;
    order?: number;
  };
  default: unknown;
  getHeadings?: () => { depth: number; slug: string; text: string }[];
};

const modules = import.meta.glob('../../content/renovate/**/*.{md,mdx}', { eager: true }) as Record<
  string,
  MdModule
>;

const markdownRaw = import.meta.glob(
  [
    '../../content/opencv4/**/*.{md,markdown}',
    '../../content/opencv5/**/*.{md,markdown}',
  ],
  {
    eager: true,
    query: '?raw',
    import: 'default',
  },
) as Record<string, string>;

/** Paths / basenames we never expose as pages */
const SKIP_BASENAMES = new Set([
  'readme',
  'index',
  'summary',
  'root',
  'faq',
  'opencv-logo',
  'tutorials', // top-level TOC noise; real tutorials live under tutorials/
]);

const SKIP_SEGMENT = new Set([
  'images',
  'assets',
  'tools',
  'js',
  'css',
]);

const NOISE_GROUPS = new Set([
  'opencv-logo',
  'images',
  'assets',
  'tools',
  'js',
]);

const DOC_EXT = /\.(md|mdx|markdown)$/i;

function humanize(slug: string): string {
  return slug
    .replace(/\.markdown$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function titleFromSlug(slugPath: string, segments: string[]): string {
  const leaf = segments[segments.length - 1] ?? slugPath;
  if (!leaf) return 'Overview';
  return humanize(leaf);
}

function parseContentPath(path: string): { tech: string; segments: string[]; base: string } | null {
  const marker = '/content/';
  const normalized = path.replace(/\\/g, '/');
  const idx = normalized.indexOf(marker);
  if (idx === -1) return null;
  const rest = normalized.slice(idx + marker.length);
  const parts = rest.split('/');
  const tech = parts[0];
  if (!tech || tech === 'manifest.json') return null;
  const file = parts[parts.length - 1] ?? '';
  if (!DOC_EXT.test(file)) return null;
  const dirParts = parts.slice(1, -1);
  if (dirParts.some((s) => SKIP_SEGMENT.has(s.toLowerCase()))) return null;
  const base = file.replace(DOC_EXT, '');
  if (dirParts.length === 0 && /^(CMakeLists|Doxyfile|LICENSE|opencv-logo)/i.test(base)) return null;
  // skip table-of-contents index pages that are mostly links
  if (/^table_of_content/i.test(base) || /^js_table_of_contents/i.test(base)) return null;

  const segments =
    SKIP_BASENAMES.has(base.toLowerCase()) && dirParts.length === 0
      ? []
      : SKIP_BASENAMES.has(base.toLowerCase()) && dirParts.length > 0 && base.toLowerCase() === 'tutorials'
        ? [...dirParts] // unlikely
        : SKIP_BASENAMES.has(base.toLowerCase())
          ? [...dirParts]
          : [...dirParts, base];

  // drop pure logo / root junk groups
  if (segments[0] && NOISE_GROUPS.has(segments[0].toLowerCase())) return null;

  return { tech, segments, base };
}

/** Strip Doxygen / OpenCV authoring directives so pages are readable as HTML */
export function cleanUpstreamMarkdown(raw: string): { title?: string; body: string } {
  let body = raw.replace(/^\uFEFF/, '');
  let title: string | undefined;

  const yaml = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (yaml) {
    const t = yaml[1].match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (t) title = t[1];
    body = body.slice(yaml[0].length);
  }

  // First heading or @title
  const atTitle = body.match(/^@title\s+(.+)\s*$/m);
  if (atTitle && !title) title = atTitle[1].trim();

  const h1 = body.match(/^#\s+(.+?)(?:\s*\{#.*?\})?\s*$/m);
  if (h1 && !title) title = h1[1].replace(/\{#.*?\}/g, '').trim();

  // Remove Doxygen-style lines and inline refs noise
  body = body
    // heading anchors {#id}
    .replace(/\s*\{#[\w.:-]+\}/g, '')
    // @prev_tutorial{...} @next_tutorial{...} on their own or inline
    .replace(/@prev_tutorial\{[^}]*\}/g, '')
    .replace(/@next_tutorial\{[^}]*\}/g, '')
    .replace(/@tableofcontents\b/g, '')
    .replace(/@tablecontents\b/g, '')
    // code-toggle scaffolding (OpenCV tutorials; often indented)
    .replace(/^[ \t]*@add_toggle\w*[ \t]*$/gm, '')
    .replace(/^[ \t]*@end_toggle[ \t]*$/gm, '')
    .replace(/^[ \t]*@include[ \t]+(\S+)[ \t]*$/gm, '\n```\n// $1\n```\n')
    // @warning / @note / @sa blocks — keep the text, drop tag
    .replace(/^[ \t]*@warning\s+/gm, '> **Warning:** ')
    .replace(/^[ \t]*@note\s+/gm, '> **Note:** ')
    .replace(/^[ \t]*@sa\s+/gm, 'See also: ')
    .replace(/^[ \t]*@brief\s+/gm, '')
    .replace(/^[ \t]*@title\s+.+$/gm, '')
    .replace(/^[ \t]*@prev_tutorial.+$/gm, '')
    .replace(/^[ \t]*@next_tutorial.+$/gm, '')
    // @ref name -> `name` (readable)
    .replace(/@ref\s+([\w:.]+)/g, '`$1`')
    // MkDocs / Renovate admonitions (may be indented)
    .replace(/^[ \t]*!!!\s+tip\s+/gim, '> **Tip:** ')
    .replace(/^[ \t]*!!!\s+note\s+/gim, '> **Note:** ')
    .replace(/^[ \t]*!!!\s+warning\s+/gim, '> **Warning:** ')
    .replace(/^[ \t]*!!!\s+info\s+/gim, '> **Info:** ')
    // collapse excess blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title, body };
}

function buildPages(): DocPage[] {
  const pages: DocPage[] = [];

  for (const [path, mod] of Object.entries(modules)) {
    const parsed = parseContentPath(path);
    if (!parsed) continue;
    const { tech, segments } = parsed;
    const slugPath = segments.join('/');
    const fm = mod.frontmatter ?? {};
    const title = fm.title ?? titleFromSlug(slugPath, segments);
    const description = fm.description ?? '';
    const depth = segments.length;
    const isIndex = segments.length === 0;
    const order = fm.order ?? (isIndex ? 0 : 10 + depth * 10);

    pages.push({
      tech,
      segments,
      slugPath,
      title,
      description,
      order,
      Content: mod.default,
      html: null,
      headings: typeof mod.getHeadings === 'function' ? mod.getHeadings() : [],
      filePath: path,
    });
  }

  for (const [path, raw] of Object.entries(markdownRaw)) {
    const parsed = parseContentPath(path);
    if (!parsed) continue;
    const { tech, segments } = parsed;
    const slugPath = segments.join('/');
    const { title: extractedTitle, body } = cleanUpstreamMarkdown(raw);
    const title = extractedTitle ?? titleFromSlug(slugPath, segments);
    const depth = segments.length;
    const isIndex = segments.length === 0;
    const order = isIndex ? 0 : 10 + depth * 10;
    const html = marked.parse(body, { async: false }) as string;

    pages.push({
      tech,
      segments,
      slugPath,
      title,
      description: '',
      order,
      Content: null,
      html,
      headings: [],
      filePath: path,
    });
  }

  const byKey = new Map<string, DocPage>();
  for (const page of pages) {
    const key = `${page.tech}\0${page.slugPath}`;
    const prev = byKey.get(key);
    if (!prev || (prev.html && page.Content)) {
      byKey.set(key, page);
    }
  }

  return [...byKey.values()].sort(
    (a, b) =>
      a.tech.localeCompare(b.tech) ||
      a.order - b.order ||
      a.slugPath.localeCompare(b.slugPath),
  );
}

let _pages: DocPage[] | null = null;

export function getAllPages(): DocPage[] {
  if (!_pages) _pages = buildPages();
  return _pages;
}

export function getPacks(): DocPack[] {
  return (manifestJson as { packs: DocPack[] }).packs;
}

export function getPack(tech: string): DocPack | undefined {
  return getPacks().find((p) => p.id === tech);
}

export function getPagesForTech(tech: string): DocPage[] {
  return getAllPages().filter((p) => p.tech === tech);
}

export function getPage(tech: string, slugPath: string): DocPage | undefined {
  const norm = slugPath.replace(/^\/+|\/+$/g, '');
  return getPagesForTech(tech).find((p) => p.slugPath === norm);
}

export function getTechsWithContent(): string[] {
  return [...new Set(getAllPages().map((p) => p.tech))].sort();
}

export function getTechNav(tech: string) {
  return getPagesForTech(tech).map(({ slugPath, title, description, order, segments }) => ({
    slugPath,
    title,
    description,
    order,
    segments,
  }));
}

/** Human label for nav groups */
export function humanizeSegment(seg: string): string {
  return humanize(seg);
}
