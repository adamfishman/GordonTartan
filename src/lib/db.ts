export interface Tartan {
  id: number;
  name: string;
  description: string;
  palette: string;
  threadcount: string;
  slug: string;
  parent_slug: string | null;
  is_official: boolean;
  origin_url: string;
  created_at: string;
}

export interface TartanListResult {
  tartans: Tartan[];
  total: number;
}

export interface AdjacentTartans {
  previous: { slug: string; name: string } | null;
  next: { slug: string; name: string } | null;
}

export async function getTartanBySlug(db: D1Database, slug: string): Promise<Tartan | null> {
  const result = await db.prepare('SELECT * FROM tartans WHERE slug = ?').bind(slug).first<Tartan>();
  return result || null;
}

export async function getTartansByLetter(
  db: D1Database,
  letter: string,
  page: number = 1,
  pageSize: number = 60
): Promise<TartanListResult> {
  const offset = (page - 1) * pageSize;
  const letterLower = letter.toLowerCase();

  const countResult = await db
    .prepare("SELECT COUNT(*) as total FROM tartans WHERE LOWER(SUBSTR(name, 1, 1)) = ?")
    .bind(letterLower)
    .first<{ total: number }>();

  const total = countResult?.total ?? 0;

  const tartans = await db
    .prepare("SELECT * FROM tartans WHERE LOWER(SUBSTR(name, 1, 1)) = ? ORDER BY slug ASC LIMIT ? OFFSET ?")
    .bind(letterLower, pageSize, offset)
    .all<Tartan>();

  return { tartans: tartans.results || [], total };
}

export async function getAdjacentTartans(db: D1Database, slug: string): Promise<AdjacentTartans> {
  const prev = await db
    .prepare("SELECT slug, name FROM tartans WHERE slug < ? ORDER BY slug DESC LIMIT 1")
    .bind(slug)
    .first<{ slug: string; name: string }>();

  const next = await db
    .prepare("SELECT slug, name FROM tartans WHERE slug > ? ORDER BY slug ASC LIMIT 1")
    .bind(slug)
    .first<{ slug: string; name: string }>();

  return {
    previous: prev || null,
    next: next || null,
  };
}

export async function getRandomOfficialSlug(db: D1Database): Promise<string | null> {
  const result = await db
    .prepare("SELECT slug FROM tartans WHERE is_official = 1 ORDER BY RANDOM() LIMIT 1")
    .first<{ slug: string }>();
  return result?.slug || null;
}

export async function createTartan(
  db: D1Database,
  data: { name: string; description?: string; palette: string; threadcount: string; slug: string; parent_slug?: string }
): Promise<Tartan> {
  await db
    .prepare(
      "INSERT INTO tartans (name, description, palette, threadcount, slug, parent_slug, is_official) VALUES (?, ?, ?, ?, ?, ?, 0)"
    )
    .bind(data.name, data.description || '', data.palette, data.threadcount, data.slug, data.parent_slug || null)
    .run();

  const created = await getTartanBySlug(db, data.slug);
  return created!;
}

export async function getLetterPageCount(db: D1Database, letter: string, pageSize: number = 60): Promise<number> {
  const letterLower = letter.toLowerCase();
  const countResult = await db
    .prepare("SELECT COUNT(*) as total FROM tartans WHERE LOWER(SUBSTR(name, 1, 1)) = ?")
    .bind(letterLower)
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;
  return Math.ceil(total / pageSize);
}

type D1Database = import('@cloudflare/workers-types').D1Database;
