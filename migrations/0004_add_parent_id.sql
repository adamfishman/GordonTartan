ALTER TABLE tartans ADD COLUMN parent_id INTEGER;

UPDATE tartans
SET parent_id = (
  SELECT p.id
  FROM tartans p
  WHERE p.slug = tartans.parent_slug
)
WHERE parent_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parent_id ON tartans(parent_id);
