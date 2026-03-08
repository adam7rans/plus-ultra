import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/gun-relay/,
          handler: 'NetworkFirst',
        }]
      },
      manifest: {
        name: 'Plus Ultra',
        short_name: 'PlusUltra',
        description: 'Tribal Operating System — survive together',
        theme_color: '#1A3A2A',
        background_color: '#0D1F16',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ]
      }
    })
  ],
  resolve: {
    alias: {
      // Gun.js needs this for browser compat
      'gun/sea': 'gun/sea.js',
    }
  }
})
