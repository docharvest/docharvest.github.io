import type { APIRoute, GetStaticPaths } from 'astro';
import { create, insertMultiple } from '@orama/orama';
import { persist } from '@orama/plugin-data-persistence';
import { getAllPagesAsync, getPacks, getPagesForTech } from '../../lib/docs';

export const prerender = true;

/** One Orama dataset per pack — never a global mixed index. */
export const getStaticPaths = (async () => {
  await getAllPagesAsync();
  return getPacks().map((p) => ({ params: { tech: p.id } }));
}) satisfies GetStaticPaths;

/** Cap markdown body in the index (still source text, not HTML). */
const MAX_BODY_CHARS = 20_000;

export const GET: APIRoute = async ({ params }) => {
  const tech = params.tech;
  if (!tech) {
    return new Response(JSON.stringify({ error: 'missing tech' }), { status: 400 });
  }

  await getAllPagesAsync();
  const pack = getPacks().find((p) => p.id === tech);
  const pages = getPagesForTech(tech);

  const db = await create({
    schema: {
      id: 'string',
      title: 'string',
      description: 'string',
      slugPath: 'string',
      path: 'string',
      /** Markdown / MDX source (not rendered HTML) */
      body: 'string',
      tech: 'string',
    },
  });

  const docs = pages.map((page) => {
    const slugPath = page.slugPath;
    const path = slugPath ? `/docs/${tech}/${slugPath}/` : `/docs/${tech}/`;
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

  if (docs.length) {
    await insertMultiple(db, docs);
  }

  const serialized = await persist(db, 'json');
  const payload =
    typeof serialized === 'string' ? serialized : JSON.stringify(serialized);

  return new Response(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Docharvest-Pack': tech,
      'X-Docharvest-Pack-Title': pack?.title ?? tech,
      'X-Docharvest-Doc-Count': String(docs.length),
    },
  });
};
