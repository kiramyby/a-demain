// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: 'night-owl',
      wrap: true
    },
  },
  integrations: [vue({ devtools: true })],
});