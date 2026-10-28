import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      // .astro pages and layouts aren't unit-tested here, so coverage covers the
      // TypeScript/TSX code: lib, API routes, data and the React components.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/env.d.ts'],
      // json-summary + json feed the PR coverage comment in CI.
      reporter: ['text', 'json-summary', 'json'],
      reportOnFailure: true,
      // Floors: CI fails if coverage drops below these. Running
      // `npm run test:coverage` locally raises them (whole numbers, never lower)
      // whenever coverage improves; commit the change with your tests.
      thresholds: {
        autoUpdate: process.env.CI ? false : (value) => Math.floor(value),
        statements: 35,
        branches: 33,
        functions: 28,
        lines: 36,
      },
    },
  },
  resolve: {
    alias: {
      'cloudflare:workers': fileURLToPath(new URL('./src/test/cloudflare-workers-stub.ts', import.meta.url)),
    },
  },
})
