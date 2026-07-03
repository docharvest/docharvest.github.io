import type { APIRoute } from 'astro';
import { getAllPagesAsync, getPacks, getPagesForTech } from '../../lib/docs';
import { sitePath } from '../../lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  await getAllPagesAsync();
  const packs = getPacks().map((p) => ({
    id: p.id,
    title: p.title,
    pages: getPagesForTech(p.id).length,
    indexUrl: sitePath(`search-indexes/${p.id}.json`),
  }));
  return new Response(JSON.stringify({ packs }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
