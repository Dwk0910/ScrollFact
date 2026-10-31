import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import manifest from './public/manifest.json' with { type: 'json' }

function stripCrossorigin(): Plugin {
  return {
    name: 'strip-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '')
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), crx({ manifest }), stripCrossorigin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: { host: '127.0.0.1' },
  },
  build: {
    // HMR writes extension loaders too. Never let them overwrite an installed build.
    outDir: command === 'serve' ? 'dist-dev' : 'dist',
    rolldownOptions: {
      input: {
        preview: 'index.html',
        integration: 'integration.html',
        panel: 'src/sidepanel/index.html',
      },
    },
  },
}))
