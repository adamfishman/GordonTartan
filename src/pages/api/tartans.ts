import type { APIRoute } from 'astro';
import { countPattern, slugify } from '../../lib/tartan';
import { createTartan, getTartanBySlug } from '../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime.env.DB;

  let body: { name?: string; palette?: string; threadcount?: string; description?: string; parent_slug?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { name, palette, threadcount, description, parent_slug } = body;

  if (!name || !palette || !threadcount) {
    return new Response(JSON.stringify({ error: 'name, palette, and threadcount are required' }), { status: 400 });
  }

  // Validate threadcount/palette by running countPattern
  try {
    const result = countPattern(threadcount, palette);
    if (result.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid threadcount/palette combination' }), { status: 400 });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid threadcount/palette format' }), { status: 400 });
  }

  // Generate unique slug
  let baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;

  while (await getTartanBySlug(db, slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  try {
    const tartan = await createTartan(db, {
      name,
      description,
      palette,
      threadcount,
      slug,
      parent_slug,
    });

    return new Response(JSON.stringify(tartan), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create tartan' }), { status: 500 });
  }
};
