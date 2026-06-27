import type { APIRoute } from 'astro';
import { getAllPagesAsync, getPacks, getPagesForTech } from '../../lib/docs';

export const prerender = true;

export const GET: APIRoute = async () => {
  await getAllPagesAsync();
  const packs = getPacks().map((p) => ({
    id: p.id,
    title: p.title,
    logo: p.logo,
    pages: getPagesForTech(p.id).length,
    indexUrl: `/search-indexes/${p.id}.json`,
  }));
  return new Response(JSON.stringify({ packs }, null, 0), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
