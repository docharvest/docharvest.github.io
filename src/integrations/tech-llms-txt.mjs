import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse } from 'node-html-parser';
import TurndownService from 'turndown';

const BOM = '\uFEFF';
const DEFAULT_EXCLUDED = new Set(['404']);
const PARSE_OPTIONS = { comment: false, blockTextElements: { script: false, style: false } };

function elementText(el) {
  return el ? el.text.replace(/\s+/g, ' ').trim() : '';
}

function htmlToMarkdown(node) {
  node
    .querySelectorAll(
      'script, style, nav, aside, [aria-hidden="true"], .page-header, .no-llms, img, picture, svg',
    )
    .forEach((el) => el.remove());

  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });

  return td.turndown(node.toString()).replace(/\n{3,}/g, '\n\n').trim();
}

async function extractPage(htmlPath, titleSource) {
  const html = await readFile(htmlPath, 'utf-8');
  const root = parse(html, PARSE_OPTIONS);

  let title = '';
  if (titleSource === 'h1') {
    title = elementText(root.querySelector('h1'));
  }
  if (!title) {
    title = elementText(root.querySelector('title'));
  }

  const descEl = root.querySelector('meta[name="description"]');
  const description = descEl ? (descEl.getAttribute('content') ?? '') : '';

  const mainEl = root.querySelector('main');
  if (mainEl) {
    const h1 = mainEl.querySelector('h1');
    if (h1) h1.remove();
  }
  const content = mainEl ? htmlToMarkdown(mainEl) : '';

  return { title, description, content };
}

/**
 * Astro integration: emit /docs/:tech/llms.txt and llms-full.txt per documentation pack.
 * Does NOT write a site-wide /llms.txt.
 */
export default function techLlmsTxt(options = {}) {
  const excludedPaths = new Set(options.excludedPaths ?? [...DEFAULT_EXCLUDED]);
  const titleSource = options.titleSource ?? 'h1';
  let site = '';

  return {
    name: 'tech-llms-txt',
    hooks: {
      'astro:config:done': ({ config, logger }) => {
        if (!config.site) {
          throw new Error(
            '[tech-llms-txt] Set `site` in astro.config (absolute URLs required for llms.txt).',
          );
        }
        site = config.site.replace(/\/$/, '');
        logger.info(`tech-llms-txt site: ${site}`);
      },

      'astro:build:done': async ({ dir, pages: builtPages, logger }) => {
        const outDir = fileURLToPath(dir);

        /** @type {Map<string, { pathname: string, title: string, description: string, content: string }[]>} */
        const byTech = new Map();

        for (const { pathname } of builtPages) {
          const clean = pathname.replace(/\/$/, '') || '/';
          if (excludedPaths.has(clean.replace(/^\//, '')) || excludedPaths.has(clean)) continue;
          if (clean.includes('.')) continue;

          // Only documentation pack routes: /docs/:tech or /docs/:tech/...
          const m = clean.match(/^\/?docs\/([^/]+)(?:\/(.*))?$/);
          if (!m) continue;

          const tech = m[1];
          const htmlFile = join(outDir, pathname.replace(/^\//, ''), 'index.html');
          const urlPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
          const normalized = urlPath.endsWith('/') ? urlPath : `${urlPath}/`;

          try {
            const data = await extractPage(htmlFile, titleSource);
            if (!byTech.has(tech)) byTech.set(tech, []);
            byTech.get(tech).push({ pathname: normalized === '//' ? '/' : normalized, ...data });
          } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            logger.warn(`[tech-llms-txt] skip unreadable ${htmlFile}: ${detail}`);
          }
        }

        for (const [tech, pages] of byTech) {
          pages.sort((a, b) => {
            const ap = a.pathname.replace(/\/$/, '') || '/';
            const bp = b.pathname.replace(/\/$/, '') || '/';
            // pack index first
            const aIndex = ap === `/docs/${tech}` || ap === `/docs/${tech}/`;
            const bIndex = bp === `/docs/${tech}` || bp === `/docs/${tech}/`;
            if (aIndex && !bIndex) return -1;
            if (!aIndex && bIndex) return 1;
            return ap.localeCompare(bp);
          });

          const name = pages[0]?.title?.replace(/\s*·.*$/, '') || tech;
          const homeDesc =
            pages.find((p) => {
              const pp = p.pathname.replace(/\/$/, '');
              return pp === `/docs/${tech}` || pp === `docs/${tech}`;
            })?.description ||
            pages[0]?.description ||
            `${tech} documentation pack`;

          const indexLines = [`# ${name}`, '', `> ${homeDesc}`, '', '## Pages', ''];
          for (const page of pages) {
            const url = `${site}${page.pathname.startsWith('/') ? page.pathname : `/${page.pathname}`}`;
            indexLines.push(`- [${page.title}](${url}): ${page.description}`);
          }
          indexLines.push('');

          const fullLines = [`# ${name}`, '', `> ${homeDesc}`, ''];
          for (const page of pages) {
            const url = `${site}${page.pathname.startsWith('/') ? page.pathname : `/${page.pathname}`}`;
            fullLines.push(`## [${page.title}](${url})`, '', page.content, '');
          }

          const techDir = join(outDir, 'docs', tech);
          await mkdir(techDir, { recursive: true });
          await Promise.all([
            writeFile(join(techDir, 'llms.txt'), BOM + indexLines.join('\n'), 'utf-8'),
            writeFile(join(techDir, 'llms-full.txt'), BOM + fullLines.join('\n'), 'utf-8'),
          ]);
          logger.info(`[tech-llms-txt] docs/${tech}/llms.txt (+ full): ${pages.length} pages`);
        }

        if (byTech.size === 0) {
          logger.warn('[tech-llms-txt] no /docs/:tech pages found');
        }
      },
    },
  };
}
