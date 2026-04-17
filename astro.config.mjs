// @ts-check

import netlify from '@astrojs/netlify'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: { plugins: [tailwindcss()] },
  integrations: [react()],
  env: {
    schema: {
      SENDGRID_ACCOUNTS: envField.string({ context: 'server', access: 'secret' })
    }
  },
  adapter: netlify()
})
