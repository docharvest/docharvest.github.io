/**
 * Pipeline: marked
 *
 * Plain text → marked → HTML. Syntax highlighting is applied later for all
 * HTML backends via `finalizeDocHtml` in docs.ts (not dialect-specific).
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

function renderMarkdown(raw: string): string {
  return marked.parse(stripYamlFrontmatter(raw), { async: false }) as string;
}

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
      const html = renderMarkdown(raw);

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
