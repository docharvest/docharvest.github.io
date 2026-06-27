/** Built-in pipeline ids. Add a module under `pipelines/` and register it in `registry.ts`. */
export type PipelineId = 'astro-md' | 'marked';

export type DocPack = {
  id: string;
  title: string;
  description: string;
  source: string;
  repo: string;
  /** How this pack’s files under `content/<id>/` are turned into pages. */
  pipeline: PipelineId;
};

export type DocPage = {
  tech: string;
  segments: string[];
  slugPath: string;
  title: string;
  description: string;
  order: number;
  /** Astro MD/MDX component (astro-md pipeline) */
  Content: unknown | null;
  /** Pre-rendered HTML (marked pipeline) */
  html: string | null;
  headings: { depth: number; slug: string; text: string }[];
  filePath: string;
  pipeline: PipelineId;
};

export type PipelineContext = {
  pack: DocPack;
};

/**
 * One rendering strategy for a documentation pack.
 * Prefer `collect` when fully sync; use `collectAsync` when highlighting needs await (Shiki).
 */
export type DocPipeline = {
  id: PipelineId;
  collect?(ctx: PipelineContext): DocPage[];
  collectAsync?(ctx: PipelineContext): Promise<DocPage[]>;
};
