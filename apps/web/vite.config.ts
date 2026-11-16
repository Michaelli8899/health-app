import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://<user>.github.io/health-app/
const base = process.env.BASE_PATH ?? '/health-app/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Health',
        short_name: 'Health',
        description: 'Private food, exercise and progress tracker with on-device photo recognition.',
        theme_color: '#16a34a',
        background_color: '#f6f7f9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + small datasets are precached. Large ML model files are cached
        // separately by Transformers.js (Cache API), so they are not precached here.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}', 'datasets/*.{json,bin}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: 'index.html',
        // ONNX Runtime's WASM binaries come from a CDN at runtime; cache them for offline use.
        // (Model weights are cached by Transformers.js itself in the browser Cache API.)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: { cacheName: 'wasm', expiration: { maxEntries: 10 } },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web/,
            handler: 'CacheFirst',
            options: { cacheName: 'onnxruntime-wasm', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
});
