import type { APIRoute } from 'astro';
import { getRandomOfficialSlug } from '../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime.env.DB;
  const slug = await getRandomOfficialSlug(db);

  if (!slug) {
    return new Response(JSON.stringify({ error: 'No tartans found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ slug }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
