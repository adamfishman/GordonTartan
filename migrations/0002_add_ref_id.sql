ALTER TABLE tartans ADD COLUMN ref_id INTEGER;

UPDATE tartans
SET ref_id = CAST(
  CASE
    WHEN instr(substr(origin_url, instr(origin_url, 'ref=') + 4), '&') > 0 THEN
      substr(
        origin_url,
        instr(origin_url, 'ref=') + 4,
        instr(substr(origin_url, instr(origin_url, 'ref=') + 4), '&') - 1
      )
    ELSE substr(origin_url, instr(origin_url, 'ref=') + 4)
  END AS INTEGER
)
WHERE origin_url LIKE '%ref=%';
