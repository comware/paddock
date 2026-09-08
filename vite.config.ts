import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

/**
 * Guide markdown that is written for authors, not growers.
 *
 * public/ is copied to dist/ wholesale, so the per-directory CLAUDE.md notes that tell an
 * agent how to write a guide, and the _template files they work from, were being published
 * alongside the guides themselves - /guides/CLAUDE.md was a real, fetchable URL in
 * production, claude-mem context and all.
 *
 * That was survivable while nothing pointed at them. It stops being survivable the moment
 * the guides are precached, because then every one of those files is downloaded onto every
 * user's device at install. So they are dropped from the build.
 *
 * Kept as a glob rather than a list because new categories arrive with a CLAUDE.md each, and
 * a list would silently stop covering them.
 */
const AUTHORING_ONLY = /(^|\/)(CLAUDE\.md|_template[^/]*\.md)$/

function stripAuthoringNotes(): Plugin {
  return {
    name: 'paddock:strip-authoring-notes',
    // After VitePWA, so the service worker is already generated. It excludes these files by
    // its own globIgnores anyway - the two are deliberately independent, because one keeps
    // them off devices and the other keeps them off the server.
    enforce: 'post',
    closeBundle() {
      const root = path.resolve(__dirname, 'dist/guides')
      if (!fs.existsSync(root)) return

      let removed = 0
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) walk(full)
          else if (AUTHORING_ONLY.test(full)) {
            fs.unlinkSync(full)
            removed++
          }
        }
      }
      walk(root)
      if (removed > 0) this.info(`stripped ${removed} authoring-only guide files from dist`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      // Proxy Anthropic API requests to bypass CORS
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward the API key from the custom header
            const apiKey = req.headers['x-api-key'];
            if (apiKey) {
              const key = Array.isArray(apiKey) ? apiKey[0] : apiKey;
              proxyReq.setHeader('x-api-key', key);
            }
            // Set required Anthropic headers
            proxyReq.setHeader('anthropic-version', '2023-06-01');
            proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
          });
        },
      },
      // Proxy OpenAI API requests to bypass CORS
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward the Authorization header
            const auth = req.headers['authorization'];
            if (auth) {
              proxyReq.setHeader('Authorization', auth);
            }
          });
        },
      },
      // Proxy Gemini API requests to bypass CORS
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Paddock',
        short_name: 'Paddock',
        description: 'Local-first small farm management platform for microgreens growing experiments',
        theme_color: '#22c55e',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        /**
         * The guides are precached, not runtime-cached.
         *
         * They were neither: `md` and `json` were absent from this list and no runtimeCaching
         * rule covered /guides/, so every guide was a live fetch. Opening the library with no
         * signal produced an error page and every crop guide was blank - in an app whose own
         * manifest calls it local-first, and whose users are typically standing in a paddock.
         *
         * Runtime caching would have been the cheaper fix and the wrong one: it only holds
         * what has already been read, so the guide you need offline is precisely the one you
         * have not opened yet. Precaching costs about 2 MB at install, roughly doubling it,
         * and buys the whole library offline from first run. For this app that is the right
         * side of the trade.
         *
         * `json` is needed as much as `md`: each library renders from an index.json, so
         * without it the guides are on the device and unreachable.
         */
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,md,json}'],
        // Author-facing prose that stripAuthoringNotes() also removes from dist. Listed here
        // too so the precache manifest is correct even if that plugin is ever dropped.
        globIgnores: ['**/CLAUDE.md', '**/_template*.md'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
    stripAuthoringNotes(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and React-DOM into their own chunk
          'vendor-react': ['react', 'react-dom'],
          // Split router into its own chunk
          'vendor-router': ['react-router-dom'],
          // Split date utilities (tree-shakable but can be lazy loaded)
          'vendor-date': ['date-fns'],
          // Split markdown rendering (only needed in specific views)
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          // Split form handling
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Split database layer
          'vendor-db': ['dexie'],
          // Split state management
          'vendor-state': ['zustand'],
        },
      },
    },
  },
})
