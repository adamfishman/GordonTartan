import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function slugify(str) {
  const a = 'àáäâãåăæąçćčđďèéěėëêęğǵḧìíïîįłḿǹńňñòóöôœøṕŕřßşśšșťțùúüûǘůűūųẃẍÿýźžż·/_,:;';
  const b = 'aaaaaaaaacccddeeeeeeegghiiiiilmnnnnooooooprrsssssttuuuuuuuuuwxyyzzz------';
  const p = new RegExp(a.split('').join('|'), 'g');
  return str
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(p, (c) => b.charAt(a.indexOf(c)))
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function parseCSV(content) {
  const lines = content.split('\n');
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current);

    if (fields.length >= 4) {
      records.push({
        Name: fields[0],
        Palette: fields[1],
        Threadcount: fields[2],
        Origin_URL: fields[3],
      });
    }
  }
  return records;
}

const csvPath = resolve(__dirname, '../src/data/tartans.csv');
const csvContent = readFileSync(csvPath, 'utf-8');
const records = parseCSV(csvContent);

console.log(`Parsed ${records.length} tartans from CSV`);

const isLocal = process.argv.includes('--local');
const remoteFlag = isLocal ? '--local' : '--remote';
const dbName = 'gordon-tartan-db';
const tmpDir = resolve(__dirname, '../.seed-tmp');
mkdirSync(tmpDir, { recursive: true });

const BATCH_SIZE = 50;
const usedSlugs = new Set();
const slugCounts = {};
const allStatements = [];

for (const record of records) {
  let baseSlug = slugify(record.Name);
  let slug = baseSlug;
  let uniqueName = record.Name;

  if (usedSlugs.has(slug)) {
    // Find next available suffix
    let suffix = slugCounts[baseSlug] || 2;
    while (usedSlugs.has(`${baseSlug}-${suffix}`)) {
      suffix++;
    }
    slugCounts[baseSlug] = suffix + 1;
    slug = `${baseSlug}-${suffix}`;
    uniqueName = `${record.Name} ${suffix}`;
  }

  usedSlugs.add(slug);

  const name = uniqueName.replace(/'/g, "''");
  const palette = record.Palette.replace(/'/g, "''");
  const threadcount = record.Threadcount.replace(/'/g, "''");
  const originUrl = record.Origin_URL.replace(/'/g, "''");

  allStatements.push(
    `INSERT INTO tartans (name, palette, threadcount, slug, is_official, origin_url) VALUES ('${name}', '${palette}', '${threadcount}', '${slug}', 1, '${originUrl}');`
  );
}

console.log(`Generated ${allStatements.length} INSERT statements, executing in batches of ${BATCH_SIZE}...`);

let batchNum = 0;
for (let i = 0; i < allStatements.length; i += BATCH_SIZE) {
  const batch = allStatements.slice(i, i + BATCH_SIZE);
  const batchFile = resolve(tmpDir, `batch_${batchNum}.sql`);
  writeFileSync(batchFile, batch.join('\n'));

  try {
    execSync(`npx wrangler d1 execute ${dbName} ${remoteFlag} --file="${batchFile}"`, {
      stdio: 'pipe',
      cwd: resolve(__dirname, '..'),
    });
  } catch (err) {
    console.error(`Error in batch ${batchNum} (rows ${i}-${i + batch.length - 1}):`, err.stderr?.toString() || err.message);
    process.exit(1);
  }

  batchNum++;
  if (batchNum % 20 === 0) {
    console.log(`  ...inserted ${i + batch.length} / ${allStatements.length}`);
  }
}

// Clean up temp files
rmSync(tmpDir, { recursive: true, force: true });

console.log(`Done! Seeded ${allStatements.length} tartans.`);
