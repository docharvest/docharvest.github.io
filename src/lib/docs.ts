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

/** Astro markdown pipeline (standard MD/MDX). */
const modules = import.meta.glob('../../content/renovate/**/*.{md,mdx}', { eager: true }) as Record<
  string,
  MdModule
>;

/**
 * Raw text + marked only — no dialect transforms.
 * OpenCV uses .markdown and relative image paths that break Astro's MD asset graph,
 * so we render with the standard marked parser and leave non-Markdown syntax as-is.
 */
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
  const base = file.replace(DOC_EXT, '');
  // Common index filenames map to the pack/section root URL
  const isIndexName = /^(readme|index|summary)$/i.test(base);
  const segments = isIndexName ? [...dirParts] : [...dirParts, base];
  return { tech, segments, base };
}

function titleFromMarkdown(raw: string): string | undefined {
  const yaml = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (yaml) {
    const t = yaml[1].match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (t) return t[1].trim();
  }
  const h1 = raw.match(/^#\s+(.+)\s*$/m);
  if (h1) return h1[1].trim();
  return undefined;
}

function bodyFromMarkdown(raw: string): string {
  const yaml = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return yaml ? raw.slice(yaml[0].length) : raw;
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
    const title = titleFromMarkdown(raw) ?? titleFromSlug(slugPath, segments);
    const depth = segments.length;
    const isIndex = segments.length === 0;
    const order = isIndex ? 0 : 10 + depth * 10;
    const html = marked.parse(bodyFromMarkdown(raw), { async: false }) as string;

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

export function humanizeSegment(seg: string): string {
  return humanize(seg);
}
