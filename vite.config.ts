import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: 'מוקד שומרון – מערכת שו"ב',
          short_name: 'מוקד שומרון',
          description: 'מערכת ניהול שגרה וחירום – מועצה אזורית שומרון',
          theme_color: '#0d0f14',
          background_color: '#0d0f14',
          display: 'standalone',
          dir: 'rtl',
          lang: 'he',
          start_url: '/',
          icons: [
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB — bundle may exceed 2MB default
          // Cache app shell (JS/CSS/HTML) with StaleWhileRevalidate
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          runtimeCaching: [
            {
              // Never cache API — always network
              urlPattern: /^\/api\//,
              handler: 'NetworkOnly',
            },
            {
              // Media files — try network first, fall back to cache
              urlPattern: /^\/uploads\//,
              handler: 'NetworkFirst',
              options: { cacheName: 'uploads', expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 } },
            },
            {
              // Google Fonts
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 } },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
            if (id.includes('/motion/')) return 'vendor-motion';
            if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/internmap/') || id.includes('/decimal.js')) return 'vendor-charts';
            if (id.includes('/socket.io-client/') || id.includes('/engine.io-client/')) return 'vendor-socket';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
