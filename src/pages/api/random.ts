import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getRandomOfficialSlug } from '../../lib/db';

export const GET: APIRoute = async () => {
  const db = env.DB;
  const slug = await getRandomOfficialSlug(db);

  if (!slug) {
    return new Response(JSON.stringify({ error: 'No tartans found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ slug }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
