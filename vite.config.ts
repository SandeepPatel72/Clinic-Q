import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        allowedHosts: true,
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          '/socket.io': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            ws: true,
          },
          '/site': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
        historyApiFallback: true,
      },
      appType: 'spa',
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'],
          manifest: {
            name: 'Clinic-Q OPD Management',
            short_name: 'Clinic-Q',
            description: 'Outpatient Department Queue Management System',
            theme_color: '#4338ca',
            background_color: '#4338ca',
            display: 'standalone',
            orientation: 'landscape',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable',
              },
              {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^\/api\//,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  networkTimeoutSeconds: 10,
                },
              },
              {
                urlPattern: /^\/socket\.io\//,
                handler: 'NetworkOnly',
              },
            ],
          },
          devOptions: {
            enabled: true,
            type: 'module',
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
