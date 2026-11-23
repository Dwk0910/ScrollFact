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

export default defineConfig(({ command, mode }) => ({
  plugins: [react(), tailwindcss(), crx({ manifest: mode === 'deductions' ? { ...manifest, name: 'ScrollFact · 근거 읽기 시뮬레이션', description: '시연 기사를 스크롤하면 해당 문단의 주장과 자료, 검토 질문를 보여줍니다.' } : manifest }), stripCrossorigin()],
  define: { 'import.meta.env.VITE_DEDUCTION_EXTENSION': JSON.stringify(mode === 'deductions') },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: { host: '127.0.0.1' },
  },
  build: {
    // HMR writes extension loaders too. Never let them overwrite an installed build.
    outDir: command === 'serve' ? 'dist-dev' : mode === 'deductions' ? 'dist-deductions' : 'dist',
    rolldownOptions: {
      input: {
        preview: 'index.html',
        coaching: 'coaching.html',
        festival: 'festival.html',
        reader: 'reader.html',
        firstEdition: 'first-edition.html',
        deductions: 'deductions.html',
        deductionSite: 'deduction-site.html',
        integration: 'integration.html',
        journey: 'journey.html',
        feed: 'feed.html',
        footnotes: 'footnotes.html',
        reviews: 'reviews.html',
        panel: 'src/sidepanel/index.html',
      },
    },
  },
}))
