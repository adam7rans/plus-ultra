import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      // Gun.js needs this for browser compat
      'gun/sea': 'gun/sea.js',
    }
  }
})
