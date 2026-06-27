/**
 * Documentation packs + page index.
 *
 * Pack metadata (including which **pipeline** renders `content/<id>/`) lives in
 * `content/manifest.json`. Pipelines are implemented under `src/lib/pipelines/`.
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

function buildPages(): DocPage[] {
  const pages: DocPage[] = [];

  for (const pack of getPacks()) {
    const pipeline = getPipeline(pack.pipeline);
    pages.push(...pipeline.collect({ pack }));
  }

  // Prefer astro-md over marked if the same slug ever appears twice (misconfig).
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

let _pages: DocPage[] | null = null;

export function getAllPages(): DocPage[] {
  if (!_pages) _pages = buildPages();
  return _pages;
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

// re-export for layout imports that used humanizeSegment from docs
void humanizeSegment;
