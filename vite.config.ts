import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** Reinicia o dev server ao salvar .dev.vars / .env.local (o código já tem HMR). */
function restartOnEnvChange(files: string[]): Plugin {
  const watched = files.map((f) => resolve(f))
  return {
    name: 'reif:restart-on-env-change',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(watched)
      const onChange = (file: string) => {
        if (!watched.includes(resolve(file))) return
        server.config.logger.info(`[reif] ${file} mudou, reiniciando…`, { timestamp: true })
        void server.restart()
      }
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare(), restartOnEnvChange(['.dev.vars', '.env.local'])],
  // Libs carregadas sob demanda (import dinâmico): pré-otimizadas na inicialização para o
  // dev server não recarregar a página na primeira vez que um formato é usado.
  optimizeDeps: {
    include: [
      'pdfjs-dist',
      'mammoth/mammoth.browser.js',
      'jszip',
      'marked',
      'dompurify',
      'highlight.js/lib/core',
      'highlight.js/lib/languages/python',
      'highlight.js/lib/languages/javascript',
      'highlight.js/lib/languages/typescript',
      'highlight.js/lib/languages/java',
      'highlight.js/lib/languages/c',
      'highlight.js/lib/languages/cpp',
      'highlight.js/lib/languages/csharp',
      'highlight.js/lib/languages/go',
      'highlight.js/lib/languages/rust',
      'highlight.js/lib/languages/ruby',
      'highlight.js/lib/languages/php',
      'highlight.js/lib/languages/sql',
      'highlight.js/lib/languages/r',
      'highlight.js/lib/languages/matlab',
      'highlight.js/lib/languages/kotlin',
      'highlight.js/lib/languages/swift',
      'highlight.js/lib/languages/bash',
      'highlight.js/lib/languages/yaml',
      'highlight.js/lib/languages/xml',
      'highlight.js/lib/languages/css',
      'highlight.js/lib/languages/latex',
      'highlight.js/lib/languages/ini',
      'highlight.js/lib/languages/json',
      '@mozilla/readability',
      'xlsx',
    ],
  },
})
