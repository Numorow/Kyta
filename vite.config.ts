import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      // TODO(milestone 1/9): real 192/512 PNG + maskable app icons, replacing this placeholder set.
      manifest: {
        name: 'Household Finance',
        short_name: 'Finance',
        description: 'Shared household finance tracker',
        theme_color: '#1E3A8A',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Only cache the app shell — never cache Supabase API responses offline,
        // this is shared financial data and must always be fetched fresh when online.
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
