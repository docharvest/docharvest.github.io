// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import techLlmsTxt from './src/integrations/tech-llms-txt.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://docharvest.github.io',
  base: '/',
  integrations: [
    mdx(),
    // Per-tech only: /docs/:tech/llms.txt and llms-full.txt (no site-wide llms.txt)
    techLlmsTxt({
      titleSource: 'h1',
      excludedPaths: ['404'],
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
