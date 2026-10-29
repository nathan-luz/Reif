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
})
