import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import lunr from 'lunr';

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

console.log(`Building search index for ${records.length} tartans...`);

const usedSlugs = new Set();
const slugCounts = {};
const store = {};

const index = lunr(function () {
  this.ref('slug');
  this.field('title');

  for (const record of records) {
    let baseSlug = slugify(record.Name);
    let slug = baseSlug;
    let uniqueName = record.Name;

    if (usedSlugs.has(slug)) {
      let suffix = slugCounts[baseSlug] || 2;
      while (usedSlugs.has(`${baseSlug}-${suffix}`)) {
        suffix++;
      }
      slugCounts[baseSlug] = suffix + 1;
      slug = `${baseSlug}-${suffix}`;
      uniqueName = `${record.Name} ${suffix}`;
    }

    usedSlugs.add(slug);

    const doc = { slug, title: uniqueName };
    store[slug] = { title: doc.title };
    this.add(doc);
  }
});

const outputDir = resolve(__dirname, '../public');
mkdirSync(outputDir, { recursive: true });

const json = { index: index.toJSON(), store };
writeFileSync(resolve(outputDir, 'search-index.json'), JSON.stringify(json));

console.log(`Search index written to public/search-index.json (${Object.keys(store).length} entries)`);
