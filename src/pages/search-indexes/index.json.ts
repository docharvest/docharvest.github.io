import type { APIRoute } from 'astro';
import { countPagesByTech, getAllPages, getPacks } from '../../lib/docs';
import { sitePath } from '../../lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const pages = await getAllPages();
  const pageCounts = countPagesByTech(pages);
  const packs = getPacks().map((p) => ({
    id: p.id,
    title: p.title,
    pages: pageCounts.get(p.id) ?? 0,
    indexUrl: sitePath(`search-indexes/${p.id}.json`),
  }));
  return new Response(JSON.stringify({ packs }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
