import type { APIRoute } from 'astro';
import { getAllPages, getPacks } from '../../lib/docs';
import { sitePath } from '../../lib/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const pages = await getAllPages();
  const packs = getPacks().map((p) => ({
    id: p.id,
    title: p.title,
    pages: pages.filter((page) => page.tech === p.id).length,
    indexUrl: sitePath(`search-indexes/${p.id}.json`),
  }));
  return new Response(JSON.stringify({ packs }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
