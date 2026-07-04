/** Built-in pipeline ids. Add a module under `pipelines/` and register it in `registry.ts`. */
export type PipelineId = 'astro-md' | 'marked';

export type DocPack = {
  id: string;
  title: string;
  description: string;
  source: string;
  repo: string;
  /** owner/repo from workspaced.cue (optional in older manifests) */
  github?: string;
  /** Logo URL; defaults to `https://github.com/{owner}.png` from `github` / `repo`. */
  logo: string;
  /** How files under `content/<id>/` become pages. */
  pipeline: PipelineId;
};

export type DocPage = {
  tech: string;
  segments: string[];
  slugPath: string;
  title: string;
  description: string;
  order: number;
  Content: unknown | null;
  html: string | null;
  /** Plain Markdown/MDX body for client MiniSearch indexes (not HTML). */
  searchText: string | null;
  headings: { depth: number; slug: string; text: string }[];
  filePath: string;
  pipeline: PipelineId;
};

export type PipelineContext = {
  pack: DocPack;
};

export type DocPipeline = {
  id: PipelineId;
  collect?(ctx: PipelineContext): DocPage[];
  collectAsync?(ctx: PipelineContext): Promise<DocPage[]>;
};
