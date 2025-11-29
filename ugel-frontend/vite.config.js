import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      devOptions: {
        enabled: false,
      },
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'img/favicon-16x16.png',
        'img/favicon-32x32.png',
        'img/apple-touch-icon.png',
        'img/maskable-512x512.png'
      ],
      manifest: {
        name: 'Control de Acceso UGEL',
        short_name: 'COAC UGEL',
        description: 'Sistema de control de acceso de personal y visitas para UGEL Talara',
        theme_color: '#ffffff',
        icons: [
          { src: 'img/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'img/pwa-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'img/pwa-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: 'img/pwa-167x167.png', sizes: '167x167', type: 'image/png' },
          { src: 'img/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: 'img/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'img/pwa-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: 'img/pwa-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'img/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'img/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60 
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@mantine/core', '@mantine/hooks', '@heroicons/react', 'lucide-react'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts', 'chartjs-plugin-datalabels'],
        }
      }
    }
  }
});