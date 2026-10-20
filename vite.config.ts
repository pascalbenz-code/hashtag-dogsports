import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'THS Performance Tracker', short_name: 'THS Tracker',
      description: 'Offline-Tracker für Turnierhundsport-Ergebnisse',
      theme_color: '#101d18', background_color: '#f4f1e8', display: 'standalone',
      orientation: 'portrait', lang: 'de-DE',
      icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
    },
    workbox: { navigateFallback: 'index.html', globPatterns: ['**/*.{js,css,html,svg,png}'] }
  })],
})
