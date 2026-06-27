/**
 * Pipeline: astro-md
 *
 * Vite/Astro processes `.md` / `.mdx` into components (syntax highlighting, assets).
 * Use for packs that are ordinary Markdown/MDX without Astro-hostile paths.
 *
 * Vite limitation: import.meta.glob patterns must be static string literals.
 * When you add a pack with pipeline "astro-md" in manifest.json, also add a
 * matching import.meta.glob for content/PACK_ID (md and mdx) into `modules` below.
 * A catch-all under content/ would also load hostile trees (e.g. OpenCV) and break the build.
 */
import type { DocPage, DocPipeline, PipelineContext } from './types';
import { pageOrder, parseContentPath, titleFromSlug } from './path';

type MdModule = {
  frontmatter: {
    title?: string;
    description?: string;
    order?: number;
  };
  default: unknown;
  getHeadings?: () => { depth: number; slug: string; text: string }[];
};

/** One glob per astro-md pack (keep in sync with manifest `pipeline: "astro-md"`). */
const modules = {
  ...import.meta.glob('../../../content/renovate/**/*.{md,mdx}', { eager: true }),
} as Record<string, MdModule>;

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

      pages.push({
        tech,
        segments,
        slugPath,
        title,
        description,
        order: pageOrder(segments, fm.order),
        Content: mod.default,
        html: null,
        headings: typeof mod.getHeadings === 'function' ? mod.getHeadings() : [],
        filePath: path,
        pipeline: 'astro-md',
      });
    }

    return pages;
  },
};
