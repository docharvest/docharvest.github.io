import { astroMdPipeline } from './astro-md';
import { markedPipeline } from './marked';
import type { DocPipeline, PipelineId } from './types';

const pipelines: Record<PipelineId, DocPipeline> = {
  'astro-md': astroMdPipeline,
  marked: markedPipeline,
};

export function getPipeline(id: PipelineId): DocPipeline {
  const p = pipelines[id];
  if (!p) {
    throw new Error(`Unknown doc pipeline "${id}". Registered: ${Object.keys(pipelines).join(', ')}`);
  }
  return p;
}
