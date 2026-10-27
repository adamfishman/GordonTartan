/// <reference types="astro/client" />

type D1Database = import('@cloudflare/workers-types').D1Database;

// Bindings from wrangler.toml, read with `import { env } from 'cloudflare:workers'`.
// Declared here rather than by loading @cloudflare/workers-types globally, whose
// globals clash with the DOM types the React components use.
declare module 'cloudflare:workers' {
  export const env: {
    DB: D1Database;
  };
}
