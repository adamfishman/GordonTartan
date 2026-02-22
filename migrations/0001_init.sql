CREATE TABLE tartans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  palette TEXT NOT NULL,
  threadcount TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_slug TEXT,
  is_official BOOLEAN DEFAULT 0,
  origin_url TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_slug ON tartans(slug);
CREATE INDEX idx_letter ON tartans(SUBSTR(slug, 1, 1));
CREATE INDEX idx_official ON tartans(is_official);
