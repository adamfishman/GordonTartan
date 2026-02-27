export interface Tartan {
  id: number;
  name: string;
  description: string;
  palette: string;
  threadcount: string;
  slug: string;
  parent_slug: string | null;
  parent_id: number | null;
  is_official: boolean;
  ref_id: number | null;
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

export interface TartanLink {
  id: number;
  slug: string;
  name: string;
}

export interface TartanFamilyTree {
  ancestors: TartanLink[];
  descendants: TartanTreeNode[];
}

export interface TartanTreeNode extends TartanLink {
  parent_id: number | null;
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

export async function getTartanById(db: D1Database, id: number): Promise<Tartan | null> {
  const result = await db.prepare('SELECT * FROM tartans WHERE id = ?').bind(id).first<Tartan>();
  return result || null;
}

export async function getTartanLinkById(db: D1Database, id: number): Promise<TartanLink | null> {
  const result = await db
    .prepare('SELECT id, slug, name FROM tartans WHERE id = ?')
    .bind(id)
    .first<TartanLink>();
  return result || null;
}

export async function getChildrenByParentId(db: D1Database, parentId: number): Promise<TartanLink[]> {
  const result = await db
    .prepare('SELECT id, slug, name FROM tartans WHERE parent_id = ? ORDER BY name ASC')
    .bind(parentId)
    .all<TartanLink>();
  return result.results || [];
}

export async function getFamilyTreeById(db: D1Database, tartanId: number): Promise<TartanFamilyTree> {
  const ancestors = await db.prepare(`
    WITH RECURSIVE ancestors(id, slug, name, parent_id) AS (
      SELECT id, slug, name, parent_id FROM tartans WHERE id = ?
      UNION ALL
      SELECT t.id, t.slug, t.name, t.parent_id
      FROM tartans t
      JOIN ancestors a ON a.parent_id = t.id
    )
    SELECT id, slug, name FROM ancestors WHERE id != ?
  `).bind(tartanId, tartanId).all<TartanLink>();

  const descendants = await db.prepare(`
    WITH RECURSIVE descendants(id, slug, name, parent_id) AS (
      SELECT id, slug, name, parent_id FROM tartans WHERE parent_id = ?
      UNION ALL
      SELECT t.id, t.slug, t.name, t.parent_id
      FROM tartans t
      JOIN descendants d ON d.id = t.parent_id
    )
    SELECT id, slug, name, parent_id FROM descendants
  `).bind(tartanId).all<TartanTreeNode>();

  return {
    ancestors: ancestors.results || [],
    descendants: descendants.results || [],
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
  data: { name: string; description?: string; palette: string; threadcount: string; slug: string; parent_slug?: string; parent_id?: number | null }
): Promise<Tartan> {
  await db
    .prepare(
      "INSERT INTO tartans (name, description, palette, threadcount, slug, parent_slug, parent_id, is_official) VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
    )
    .bind(
      data.name,
      data.description || '',
      data.palette,
      data.threadcount,
      data.slug,
      data.parent_slug || null,
      data.parent_id ?? null
    )
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
