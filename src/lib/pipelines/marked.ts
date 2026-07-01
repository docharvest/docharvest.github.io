/**
 * Pipeline: marked
 *
 * Plain text → marked → HTML. Syntax highlighting is applied later for all
 * HTML backends via `finalizeDocHtml` in docs.ts (not dialect-specific).
 *
 * Also accepts `.mdx` as **raw source** (imports/exports stripped). Use this for
 * packs that ship MDX but depend on host-only components (e.g. Starlight) that
 * cannot compile under this site — prefer `astro-md` only when the MDX is self-contained.
 */
import { marked } from 'marked';
import type { DocPage, DocPipeline, PipelineContext } from './types';
import {
  ensureLeadingH1Markdown,
  pageOrder,
  parseContentPath,
  stripYamlFrontmatter,
  titleFromDocSource,
} from './path';

const sources = import.meta.glob('../../../content/**/*.{md,mdx,markdown}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** Drop MDX module syntax so the rest can be treated as Markdown. */
function stripMdxModuleSyntax(raw: string): string {
  // import/export may span lines until `;` (common in Starlight docs).
  return raw
    .replace(/^import\s[\s\S]*?;\s*$/gm, '')
    .replace(/^export\s[\s\S]*?;\s*$/gm, '');
}

function renderMarkdown(raw: string): string {
  return marked.parse(stripYamlFrontmatter(raw), { async: false }) as string;
}

export const markedPipeline: DocPipeline = {
  id: 'marked',
  collect({ pack }: PipelineContext): DocPage[] {
    const pages: DocPage[] = [];

    for (const [path, fileRaw] of Object.entries(sources)) {
      const parsed = parseContentPath(path, pack.id);
      if (!parsed) continue;
      const { tech, segments } = parsed;
      const slugPath = segments.join('/');
      const isMdx = /\.mdx$/i.test(path);
      const raw = isMdx ? stripMdxModuleSyntax(fileRaw) : fileRaw;
      const title = titleFromDocSource(raw, segments, slugPath);
      // Chosen title is also the first H1 in the rendered body (nav + article agree)
      const prepared = ensureLeadingH1Markdown(raw, title);
      const html = renderMarkdown(prepared);

      pages.push({
        tech,
        segments,
        slugPath,
        title,
        description: '',
        order: pageOrder(segments),
        Content: null,
        html,
        // Index source markdown (post title H1 rewrite), not rendered HTML
        searchText: stripYamlFrontmatter(prepared),
        headings: [],
        filePath: path,
        pipeline: 'marked',
      });
    }

    return pages;
  },
};
