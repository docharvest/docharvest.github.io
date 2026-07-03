import type { APIRoute, GetStaticPaths } from 'astro';
import { getAllPagesAsync, getPacks, getPagesForTech } from '../../lib/docs';
import { sitePath } from '../../lib/site';

export const prerender = true;

/** Per-pack document list (`searchText`). Client builds MiniSearch in the browser. */
export const getStaticPaths = (async () => {
  await getAllPagesAsync();
  return getPacks().map((p) => ({ params: { tech: p.id } }));
}) satisfies GetStaticPaths;

const MAX_BODY_CHARS = 20_000;

export const GET: APIRoute = async ({ params }) => {
  const tech = params.tech;
  if (!tech) {
    return new Response(JSON.stringify({ error: 'missing tech' }), { status: 400 });
  }

  await getAllPagesAsync();
  const pack = getPacks().find((p) => p.id === tech);
  const pages = getPagesForTech(tech);

  const documents = pages.map((page) => {
    const slugPath = page.slugPath;
    const path = slugPath ? sitePath(`docs/${tech}/${slugPath}/`) : sitePath(`docs/${tech}/`);
    const md =
      page.searchText?.trim() ||
      [page.title, page.description].filter(Boolean).join('\n\n');
    const body = md.length > MAX_BODY_CHARS ? md.slice(0, MAX_BODY_CHARS) : md;
    return {
      id: `${tech}:${slugPath || '_index'}`,
      title: page.title,
      description: page.description || '',
      slugPath,
      path,
      body,
      tech,
    };
  });

  const payload = JSON.stringify({
    tech,
    title: pack?.title ?? tech,
    documents,
  });

  return new Response(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
