/**
 * Pack metadata and page index.
 * Packs come from `workspaced.cue` (`#docs`). HTML pipelines run through
 * `finalizeDocHtml` so code blocks share one Shiki setup.
 */
import manifestJson from '../../content/manifest.json';
import { logoFromGithub } from './brand';
import { finalizeDocHtml } from './pipelines/highlight';
import { getPipeline } from './pipelines/registry';
import type { DocPack, DocPage, PipelineId } from './pipelines/types';

export type { DocPack, DocPage, PipelineId } from './pipelines/types';
export { humanizeSegment } from './pipelines/path';

const DEFAULT_PIPELINE: PipelineId = 'astro-md';

function normalizePack(raw: Partial<DocPack> & { id: string }): DocPack {
  const github = raw.github ?? '';
  const repo = raw.repo ?? (github ? `https://github.com/${github}` : '');
  return {
    id: raw.id,
    title: raw.title ?? raw.id,
    description: raw.description ?? '',
    source: raw.source ?? '',
    repo,
    github: github || undefined,
    logo: raw.logo || logoFromGithub(github || repo) || '',
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

async function buildPages(): Promise<DocPage[]> {
  const pages: DocPage[] = [];

  for (const pack of getPacks()) {
    pages.push(...getPipeline(pack.pipeline).collect({ pack }));
  }

  const highlighted = await Promise.all(
    pages.map(async (page) =>
      page.html ? { ...page, html: await finalizeDocHtml(page.html) } : page,
    ),
  );

  const byKey = new Map<string, DocPage>();
  for (const page of highlighted) {
    byKey.set(`${page.tech}\0${page.slugPath}`, page);
  }

  return [...byKey.values()].sort(
    (a, b) =>
      a.tech.localeCompare(b.tech) ||
      a.order - b.order ||
      a.slugPath.localeCompare(b.slugPath),
  );
}

const pagesPromise = buildPages();

export function getAllPages(): Promise<DocPage[]> {
  return pagesPromise;
}

export async function getPagesForTech(tech: string): Promise<DocPage[]> {
  return (await getAllPages()).filter((p) => p.tech === tech);
}

export async function getPage(tech: string, slugPath: string): Promise<DocPage | undefined> {
  const norm = slugPath.replace(/^\/+|\/+$/g, '');
  return (await getPagesForTech(tech)).find((p) => p.slugPath === norm);
}

export async function getTechNav(tech: string) {
  return (await getPagesForTech(tech)).map(({ slugPath, title, description, order, segments }) => ({
    slugPath,
    title,
    description,
    order,
    segments,
  }));
}
