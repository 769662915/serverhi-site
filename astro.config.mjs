import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://serverhi.com',
  integrations: [
    react(),
    sitemap({
      // Post and topic URLs share their publication rules with the content sitemap.
      filter: (page) => !/^\/(?:404\/?$|search\/?$|posts\/[^/]+\/|tag\/)/.test(new URL(page).pathname),
      customSitemaps: ['https://serverhi.com/sitemap-content.xml'],
    }),
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
  build: {
    inlineStylesheets: 'auto',
    assets: '_assets',
  },
  compressHTML: true,
  vite: {
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
          },
        },
      },
    },
  },
});
