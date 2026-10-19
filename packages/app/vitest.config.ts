import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'gun/sea': 'gun/sea.js',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    // tests/ holds Playwright screenshot specs (capture-*.spec.ts) — they use
    // Playwright's test() and must run under `playwright test`, never vitest.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/**',
    ],
  },
})
