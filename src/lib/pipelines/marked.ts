/**
 * marked pipeline: plain text to HTML. Highlighting happens later in
 * `finalizeDocHtml` (shared across HTML backends).
 *
 * `.mdx` is accepted as raw source with imports/exports stripped. Use this when
 * upstream MDX needs host-only components (e.g. Starlight). Prefer `astro-md`
 * only when the MDX is self-contained.
 */
import { marked } from 'marked';
import type { DocPage, DocPipeline, PipelineContext } from './types';
import {
  descriptionFromYamlFrontmatter,
  ensureLeadingH1Markdown,
  extractAtxHeadings,
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

/**
 * Drop MDX module-level `import` / `export` so the rest can be treated as Markdown.
 *
 * - Only outside fenced ``` / ~~~ blocks (examples must keep their import lines).
 * - Single-line statements with or without a trailing `;` (Starlight often omits it).
 * - Multi-line import/export continued until `;`, a `from '…'` line, or non-continuation.
 */
function stripMdxModuleSyntax(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  let fence: string | null = null;
  let skipping = false;

  const endsModuleStmt = (line: string): boolean => {
    if (/;\s*$/.test(line)) return true;
    // import x from 'y' | } from "y" | import 'side-effect'
    if (/\bfrom\s+['"][^'"]+['"]\s*$/.test(line)) return true;
    if (/^import\s+['"][^'"]+['"]\s*$/.test(line)) return true;
    return false;
  };

  const isModuleContinuation = (line: string): boolean => {
    if (line.trim() === '') return false;
    if (/^\s/.test(line)) return true;
    if (/^[})\]]/.test(line.trim())) return true;
    if (/^from\s+['"]/.test(line.trim())) return true;
    return false;
  };

  for (const line of lines) {
    if (fence) {
      out.push(line);
      const ch = fence[0]!;
      let n = 0;
      while (n < line.length && line[n] === ch) n++;
      if (n >= fence.length && line.slice(n).trim() === '') fence = null;
      continue;
    }

    const fenceOpen = line.match(/^(`{3,}|~{3,})/);
    if (fenceOpen) {
      fence = fenceOpen[1]!;
      out.push(line);
      continue;
    }

    if (skipping) {
      if (isModuleContinuation(line) || endsModuleStmt(line)) {
        if (endsModuleStmt(line)) skipping = false;
        continue;
      }
      // Not a continuation — resume normal handling of this line.
      skipping = false;
    }

    if (/^(import|export)\s/.test(line)) {
      if (endsModuleStmt(line)) continue;
      // Multi-line form (e.g. `import {\n  A\n} from 'pkg'`).
      skipping = true;
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
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
      // Same frontmatter source as title; empty when pack docs omit description.
      const description = descriptionFromYamlFrontmatter(raw) ?? '';
      // Chosen title is also the first H1 in the rendered body (nav + article agree)
      const prepared = ensureLeadingH1Markdown(raw, title);
      const html = renderMarkdown(prepared);

      pages.push({
        tech,
        segments,
        slugPath,
        title,
        description,
        order: pageOrder(segments),
        Content: null,
        html,
        // Index source markdown (post title H1 rewrite), not rendered HTML
        searchText: stripYamlFrontmatter(prepared),
        // Same prepared body as searchText / html so H1 matches ensureLeadingH1Markdown
        headings: extractAtxHeadings(prepared),
        filePath: path,
        pipeline: 'marked',
      });
    }

    return pages;
  },
};
