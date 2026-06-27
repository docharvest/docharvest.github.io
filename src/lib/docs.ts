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
  /** Path segments under the tech root, empty = pack index */
  segments: string[];
  /** URL slug path relative to /docs/:tech/ ('' for index) */
  slugPath: string;
  title: string;
  description: string;
  order: number;
  Content: unknown;
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

const modules = import.meta.glob('../../content/**/*.{md,mdx}', { eager: true }) as Record<
  string,
  MdModule
>;

const SKIP_BASENAMES = new Set(['readme', 'index', 'summary']);

function titleFromSlug(slugPath: string, segments: string[]): string {
  const leaf = segments[segments.length - 1] ?? slugPath;
  if (!leaf) return 'Overview';
  return leaf
    .split(/[-_]/)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function parseModulePath(path: string): { tech: string; segments: string[] } | null {
  // ../../content/<tech>/...file.md
  const marker = '/content/';
  const idx = path.replace(/\\/g, '/').indexOf(marker);
  if (idx === -1) return null;
  const rest = path.replace(/\\/g, '/').slice(idx + marker.length);
  const parts = rest.split('/');
  const tech = parts[0];
  if (!tech || tech === 'manifest.json') return null;
  const file = parts[parts.length - 1] ?? '';
  if (!/\.(md|mdx)$/.test(file)) return null;
  const dirParts = parts.slice(1, -1);
  const base = file.replace(/\.(md|mdx)$/, '');
  const segments =
    SKIP_BASENAMES.has(base.toLowerCase()) && dirParts.length === 0
      ? []
      : SKIP_BASENAMES.has(base.toLowerCase())
        ? [...dirParts]
        : [...dirParts, base];
  return { tech, segments };
}

function buildPages(): DocPage[] {
  const pages: DocPage[] = [];

  for (const [path, mod] of Object.entries(modules)) {
    const parsed = parseModulePath(path);
    if (!parsed) continue;
    const { tech, segments } = parsed;
    const slugPath = segments.join('/');
    const fm = mod.frontmatter ?? {};
    const title = fm.title ?? titleFromSlug(slugPath, segments);
    const description = fm.description ?? '';
    // Prefer shallower pages and readme/index earlier
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
      headings: typeof mod.getHeadings === 'function' ? mod.getHeadings() : [],
      filePath: path,
    });
  }

  return pages.sort(
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

/** Techs that have at least one content file on disk */
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
