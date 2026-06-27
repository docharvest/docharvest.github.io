/**
 * Pipeline: marked
 *
 * Load source as plain text and run the standard `marked` parser.
 * No dialect transforms — Doxygen / MkDocs / etc. stay as written.
 *
 * Use when Astro’s MD pipeline cannot load the tree (e.g. `.markdown` extension
 * or relative images that are not real Vite imports).
 */
import { marked } from 'marked';
import type { DocPage, DocPipeline, PipelineContext } from './types';
import {
  pageOrder,
  parseContentPath,
  stripYamlFrontmatter,
  titleFromFrontmatterOrH1,
  titleFromSlug,
} from './path';

const sources = import.meta.glob('../../../content/**/*.{md,markdown}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export const markedPipeline: DocPipeline = {
  id: 'marked',
  collect({ pack }: PipelineContext): DocPage[] {
    const pages: DocPage[] = [];

    for (const [path, raw] of Object.entries(sources)) {
      const parsed = parseContentPath(path, pack.id);
      if (!parsed) continue;
      const { tech, segments } = parsed;
      const slugPath = segments.join('/');
      const title = titleFromFrontmatterOrH1(raw) ?? titleFromSlug(slugPath, segments);
      const html = marked.parse(stripYamlFrontmatter(raw), { async: false }) as string;

      pages.push({
        tech,
        segments,
        slugPath,
        title,
        description: '',
        order: pageOrder(segments),
        Content: null,
        html,
        headings: [],
        filePath: path,
        pipeline: 'marked',
      });
    }

    return pages;
  },
};
