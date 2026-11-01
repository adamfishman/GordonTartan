-- Letter pages filter on LOWER(SUBSTR(name, 1, 1)), which idx_letter (built on
-- slug) can't serve, so every letter-page count and list was a full table scan
-- (~5.5k rows read per query). This expression index matches the query text in
-- src/lib/db.ts exactly; the trailing slug column also satisfies ORDER BY slug.
CREATE INDEX IF NOT EXISTS idx_name_letter ON tartans(LOWER(SUBSTR(name, 1, 1)), slug);
