import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://matane-mansour.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind()],
});
