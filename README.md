# GordonTartan

A fork of [Tartanify.com](https://tartanify.com) — a collection of over 5,000 tartan patterns available to browse, explore, download, and customise.

## Acknowledgements

This project is based on the original work of **[PeHaa](https://pehaa.com)** (Paulina Hetman) and **[Joe Vains](https://twitter.com/joevains)** (Sylvain Guizard). The original [Tartanify.com](https://tartanify.com) was conceived during a trip to Scotland, with the goal of making the vast wealth of tartan patterns freely accessible on the web. All credit for the original design, development, and data sourcing goes to them.

- Original repository: [github.com/pehaa/tartanify](https://github.com/pehaa/tartanify)
- Tartan data sourced from the [Scottish Register of Tartans](https://www.tartanregister.gov.uk/index)

## Current Functionality

- **Browse 5,000+ tartans** — explore the full collection via an A–Z alphabetical index
- **Individual tartan pages** — each tartan has a dedicated page showing its pattern, colour palette, and threadcount, with a link to its official entry in the Scottish Register of Tartans
- **SVG download** — download any tartan as a seamless, repeating SVG tile
- **PNG download** — download any tartan as a PNG image
- **Search** — find tartans by name using the built-in search widget (fuzzy + wildcard matching via Lunr.js)
- **Previous / next navigation** — step through the collection from any individual tartan page
- **Random tartan** — jump to a randomly selected official tartan
- **Tartan editor** — create and save custom tartan variants with a live SVG preview

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Astro](https://astro.build) v5 (SSR mode) |
| Interactive components | React 19 |
| Hosting | Cloudflare Workers + Pages |
| Database | Cloudflare D1 (SQLite) |
| Search index | Lunr.js (pre-built at build time) |
| Language | TypeScript (strict) |

Tartan patterns are generated programmatically as SVG from palette and threadcount data stored in a Cloudflare D1 database, seeded from the original CSV supplied by the Scottish Register of Tartans.

## Development / Fork setup

If you work from a **fork** (e.g. you open PRs into another repo), point `origin` at **your fork** and add `upstream` for the repo you contribute to:

```bash
# See current remotes
git remote -v

# If origin points at the wrong repo, fix it:
# 1. Rename current origin to upstream (the repo you're contributing to)
git remote rename origin upstream

# 2. Add your fork as origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin git@github.com:YOUR_USERNAME/GordonTartan.git

# 3. Push branches and set upstream to your fork
git push -u origin main
git push -u origin <your-feature-branch>
```

Then use `git push origin <branch>` to push to your fork and open PRs from there.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v18+)
- A [Cloudflare account](https://cloudflare.com) with Wrangler authenticated (`npx wrangler login`)

### Install dependencies

```bash
npm install
```

### Seed the local database

```bash
npm run seed
```

### Run the development server

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Build for production

```bash
npm run build
```

### Deploy to Cloudflare

```bash
npm run deploy
```
