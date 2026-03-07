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
  const normalizedName = name?.trim();
  const normalizedPalette = palette?.trim();
  const normalizedThreadcount = threadcount?.trim();
  const normalizedParentSlug = parent_slug?.trim() || undefined;

  if (!normalizedName || !normalizedPalette || !normalizedThreadcount) {
    return new Response(JSON.stringify({ error: 'name, palette, and threadcount are required' }), { status: 400 });
  }

  // Validate threadcount/palette by running countPattern
  try {
    const result = countPattern(normalizedThreadcount, normalizedPalette);
    const hasPositiveSegment = result.some((entry) => Number.isFinite(entry.size) && entry.size > 0);
    if (!hasPositiveSegment) {
      return new Response(JSON.stringify({ error: 'Invalid threadcount/palette combination' }), { status: 400 });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid threadcount/palette format' }), { status: 400 });
  }

  // Generate unique slug
  const baseSlug = slugify(normalizedName);
  if (!baseSlug) {
    return new Response(JSON.stringify({ error: 'Invalid tartan name' }), { status: 400 });
  }
  let slug = baseSlug;
  let suffix = 2;

  while (await getTartanBySlug(db, slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  let parentId: number | null = null;
  if (normalizedParentSlug) {
    const parent = await getTartanBySlug(db, normalizedParentSlug);
    if (!parent) {
      return new Response(JSON.stringify({ error: 'Parent tartan not found' }), { status: 400 });
    }
    parentId = parent.id;
  }

  try {
    const tartan = await createTartan(db, {
      name: normalizedName,
      description,
      palette: normalizedPalette,
      threadcount: normalizedThreadcount,
      slug,
      parent_slug: normalizedParentSlug,
      parent_id: parentId,
    });

    return new Response(JSON.stringify(tartan), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create tartan' }), { status: 500 });
  }
};
