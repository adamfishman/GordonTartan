-- idx_slug duplicates the automatic index SQLite builds for the UNIQUE slug column.
-- idx_letter (first letter of slug) isn't used by any query; letter pages use
-- idx_name_letter from 0005. idx_official stopped being used when the random-tartan
-- query switched to a primary-key seek, and nearly every row is official anyway.
DROP INDEX IF EXISTS idx_slug;
DROP INDEX IF EXISTS idx_letter;
DROP INDEX IF EXISTS idx_official;
