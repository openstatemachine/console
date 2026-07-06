import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

// Static marketing site for openstatemachine.org.
// The interactive OSML sandbox now lives in the console at sandbox.openstatemachine.org.
export default defineConfig({
  site: 'https://openstatemachine.org',
  integrations: [sitemap()],
})
