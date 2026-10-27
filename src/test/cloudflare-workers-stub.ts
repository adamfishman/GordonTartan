// Stand-in for the `cloudflare:workers` runtime module, which only exists inside
// workerd. vitest.config.ts aliases the import here; tests set env.DB as needed.
export const env: { DB: unknown } = { DB: {} };
