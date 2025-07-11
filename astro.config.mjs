// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';

import tailwindcss from '@tailwindcss/vite';

import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: 'night-owl',
      wrap: true
    },
  },

  integrations: [vue({ devtools: true }), icon()],

  vite: {
    plugins: [tailwindcss()],
  },
});