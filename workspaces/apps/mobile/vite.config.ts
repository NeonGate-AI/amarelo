import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const developmentServer = {
  host: '127.0.0.1',
  port: 3003,
  strictPort: true
} as const

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'CHATTERBOX_')
  const conversationProxy = {
    '/api': {
      changeOrigin: false,
      rewrite: (requestPath: string) => requestPath.replace(/^\/api/u, ''),
      target: environment.CHATTERBOX_URL ?? 'http://127.0.0.1:3004'
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'generateSW',
        registerType: 'prompt',
        injectRegister: null,
        includeManifestIcons: false,
        manifest: {
          id: '/',
          name: 'Amarelo',
          short_name: 'Amarelo',
          description: 'Protótipo local da conversa por voz do Amarelo.',
          lang: 'pt-BR',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#F9F8F2',
          theme_color: '#F9F8F2',
          icons: [
            {
              src: '/icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icons/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api(?:\/|$)/u],
          runtimeCaching: []
        },
        devOptions: {
          enabled: false
        }
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      ...developmentServer,
      proxy: conversationProxy
    },
    preview: { ...developmentServer, proxy: conversationProxy }
  }
})
