import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'KuCuci',
        short_name: 'KuCuci',
        description: 'Cuci Bersih, Hidup Lebih Praktis',
        theme_color: '#0D9488',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        lang: 'id',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // JANGAN biarkan service worker menyadap rute API backend
        // (kritikal: tanpa ini, navigasi ke /api/auth/google di-ganti
        // index.html oleh SW → request tidak pernah sampai ke fungsi
        // Cloudflare → login Google gagal & tetap jadi "tamu").
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Rute API/backend: selalu lewat jaringan (NetworkOnly) supaya
          // benar-benar sampai ke fungsi Cloudflare Pages.
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/sheetdb\.io\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sheetdb-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
})
