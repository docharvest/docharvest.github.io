/**
 * Pipeline: marked + Shiki
 *
 * Load source as plain text, parse with `marked`, highlight fences with Shiki
 * (github-light / github-dark, defaultColor: false — matches astro.config).
 * No dialect transforms.
 */
import { Marked } from 'marked';
import type { DocPage, DocPipeline, PipelineContext } from './types';
import { highlightCode, warmHighlighter } from './highlight';
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

const marked = new Marked();

// Extend defaults — do not pass a partial renderer into parse() (wipes built-ins).
marked.use({
  async: true,
  renderer: {
    code({ text, lang }) {
      return highlightCode(text, lang);
    },
  },
});

async function renderMarkdown(raw: string): Promise<string> {
  const body = stripYamlFrontmatter(raw);
  return (await marked.parse(body)) as string;
}

export const markedPipeline: DocPipeline = {
  id: 'marked',
  async collectAsync({ pack }: PipelineContext): Promise<DocPage[]> {
    await warmHighlighter();
    const pages: DocPage[] = [];

    for (const [path, raw] of Object.entries(sources)) {
      const parsed = parseContentPath(path, pack.id);
      if (!parsed) continue;
      const { tech, segments } = parsed;
      const slugPath = segments.join('/');
      const title = titleFromFrontmatterOrH1(raw) ?? titleFromSlug(slugPath, segments);
      const html = await renderMarkdown(raw);

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
