/**
 * Documentation packs + page index.
 *
 * Pack metadata and pipeline are defined in `workspaced.cue` (`#docs`), exposed on
 * each `docs_*` module as `config.pack`. `content/manifest.json` is rendered by
 * `.workspaced/config/content/manifest.json.tmpl` on `workspaced codebase apply`.
 * Inspect evaluated config: `workspaced codebase config dump`.
 */
import manifestJson from '../../content/manifest.json';
import { getPipeline } from './pipelines/registry';
import { humanizeSegment } from './pipelines/path';
import type { DocPack, DocPage, PipelineId } from './pipelines/types';

export type { DocPack, DocPage, PipelineId } from './pipelines/types';
export { humanizeSegment } from './pipelines/path';
export { getPipeline, listPipelines } from './pipelines/registry';

const DEFAULT_PIPELINE: PipelineId = 'astro-md';

function normalizePack(raw: Partial<DocPack> & { id: string }): DocPack {
  return {
    id: raw.id,
    title: raw.title ?? raw.id,
    description: raw.description ?? '',
    source: raw.source ?? '',
    repo: raw.repo ?? '',
    pipeline: (raw.pipeline as PipelineId | undefined) ?? DEFAULT_PIPELINE,
  };
}

export function getPacks(): DocPack[] {
  const packs = (manifestJson as { packs: Array<Partial<DocPack> & { id: string }> }).packs ?? [];
  return packs.map(normalizePack);
}

export function getPack(tech: string): DocPack | undefined {
  return getPacks().find((p) => p.id === tech);
}

async function buildPagesAsync(): Promise<DocPage[]> {
  const pages: DocPage[] = [];

  for (const pack of getPacks()) {
    const pipeline = getPipeline(pack.pipeline);
    if (pipeline.collectAsync) {
      pages.push(...(await pipeline.collectAsync({ pack })));
    } else if (pipeline.collect) {
      pages.push(...pipeline.collect({ pack }));
    } else {
      throw new Error(`Pipeline ${pipeline.id} has neither collect nor collectAsync`);
    }
  }

  const byKey = new Map<string, DocPage>();
  for (const page of pages) {
    const key = `${page.tech}\0${page.slugPath}`;
    const prev = byKey.get(key);
    if (!prev || (prev.pipeline === 'marked' && page.pipeline === 'astro-md')) {
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

// Eager async init at module load (Astro build / Vite SSR supports top-level await).
const pagesPromise = buildPagesAsync();

export async function getAllPagesAsync(): Promise<DocPage[]> {
  return pagesPromise;
}

/** Sync accessor — only valid after pagesPromise settled; prefer getAllPagesAsync in async contexts. */
let _pagesSync: DocPage[] | null = null;
pagesPromise.then((p) => {
  _pagesSync = p;
});

export function getAllPages(): DocPage[] {
  if (!_pagesSync) {
    throw new Error(
      'Doc pages not ready yet (Shiki warm-up). Use getAllPagesAsync() in getStaticPaths / async frontmatter.',
    );
  }
  return _pagesSync;
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

void humanizeSegment;
