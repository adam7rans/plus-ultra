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
  },
})
