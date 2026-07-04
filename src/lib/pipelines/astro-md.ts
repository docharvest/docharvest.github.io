/**
 * astro-md pipeline: Vite compiles `.md` / `.mdx` into components.
 * Use when the pack is ordinary Markdown/MDX (no host-only imports).
 *
 * `import.meta.glob` patterns must be static literals. For each `#docs` entry
 * with `pipeline: "astro-md"`, add matching globs under `modules` and `sources`.
 */
import type { DocPage, DocPipeline, PipelineContext } from './types';
import { pageOrder, parseContentPath, stripYamlFrontmatter, titleFromSlug } from './path';

type MdModule = {
  frontmatter: {
    title?: string;
    description?: string;
    order?: number;
  };
  default: unknown;
  getHeadings?: () => { depth: number; slug: string; text: string }[];
};

/** One glob per astro-md pack (keep in sync with `#docs`). */
const modules = {
  ...import.meta.glob('../../../content/renovate/**/*.{md,mdx}', { eager: true }),
} as Record<string, MdModule>;

/** Raw source for search; same paths as `modules`, text only. */
const sources = {
  ...import.meta.glob('../../../content/renovate/**/*.{md,mdx}', {
    eager: true,
    query: '?raw',
    import: 'default',
  }),
} as Record<string, string>;

export const astroMdPipeline: DocPipeline = {
  id: 'astro-md',
  collect({ pack }: PipelineContext): DocPage[] {
    const pages: DocPage[] = [];

    for (const [path, mod] of Object.entries(modules)) {
      const parsed = parseContentPath(path, pack.id);
      if (!parsed) continue;
      const { tech, segments } = parsed;
      const slugPath = segments.join('/');
      const fm = mod.frontmatter ?? {};
      const title = fm.title ?? titleFromSlug(slugPath, segments);
      const description = fm.description ?? '';
      const raw = sources[path];
      const searchText = raw != null ? stripYamlFrontmatter(raw) : null;

      pages.push({
        tech,
        segments,
        slugPath,
        title,
        description,
        order: pageOrder(segments, fm.order),
        Content: mod.default,
        html: null,
        searchText,
        headings: typeof mod.getHeadings === 'function' ? mod.getHeadings() : [],
        filePath: path,
        pipeline: 'astro-md',
      });
    }

    return pages;
  },
};
