# AGENTS.md

## Cursor Cloud specific instructions

### Overview
Gordon Tartan is an Astro 5 + React 19 SSR app for browsing ~5,500 Scottish tartan patterns, deployed on Cloudflare Workers with a D1 (SQLite) database. Dev server runs via Wrangler.

### Key commands
See `package.json` scripts. Summary:
- **Dev server**: `npm run dev` (runs `wrangler dev`, serves at `http://localhost:8787`)
- **Tests**: `npm test` (Vitest, 97 unit/integration tests — no Cloudflare auth required)
- **Build**: `npm run build` (builds search index + Astro production build)
- **Type check**: `npx astro check`

### Non-obvious caveats

- **Wrangler v4 required**: The project uses `compatibility_date = "2026-02-22"` and React 19 SSR which requires `MessageChannel` in the Workers runtime. Wrangler v3 does not support this; wrangler v4 must be installed (`npm install --save-dev wrangler@4`).
- **Local D1 database must be seeded before running the dev server**: Run the migration first, then seed:
  ```
  npx wrangler d1 execute gordon-tartan-db --local --file=migrations/0001_init.sql
  node scripts/seed-d1.js --local
  ```
  This populates `.wrangler/state/v3/d1/` with ~5,495 tartan records from `src/data/tartans.csv`. No Cloudflare authentication is needed for local mode.
- **Search index**: `node scripts/build-search-index.js` generates `public/search-index.json`. This is auto-run during `npm run build` but must be run manually for dev if search is needed.
- **No Docker or external services needed**: D1 is embedded locally via Wrangler's Miniflare. No Redis, Postgres, or other external dependencies.
- **The `npm run seed` script defaults to `--remote`**: For local development, always pass `--local` explicitly: `node scripts/seed-d1.js --local`.
