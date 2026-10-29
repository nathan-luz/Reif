import { defineConfig } from 'vitest/config'

// Config separada do vite.config.ts: os testes unitários não sobem o runtime do Workers.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    setupFiles: ['src/test/setup-dom.ts'],
  },
})
