import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  // The site has no sessions; without this the adapter adds a SESSION KV binding.
  session: false,
  // Astro 7 defaults to 'jsx', which can drop spaces between inline elements.
  // Keep the v5 behaviour so pages render exactly as before.
  compressHTML: true,
  adapter: cloudflare({
    // No image transforms: images are served as-is (was 'passthrough' + the noop service).
    imageService: 'passthrough',
  }),
  integrations: [react()],
  image: {
    service: { entrypoint: 'astro/assets/services/noop' },
  },
});
