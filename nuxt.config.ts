// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxtjs/tailwindcss', '@vite-pwa/nuxt'],
  app: {
    // ここの名前を実際のGitHubリポジトリ名と完全に同じにします（例: '/calorie-input/'）
    baseURL: '/calorie_input/', 
    buildAssetsDir: '/static/' // Windows環境のアンダースコア問題を回避
  },
  nitro: {
    preset: 'github-pages'
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '食事解析カメラ',
      short_name: '食事カメラ',
      description: 'カメラで食事を記録するアプリ',
      theme_color: '#ffffff',
      background_color: '#f9fafb',
      display: 'standalone',
      orientation: 'portrait',
      lang: 'ja',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      // Windows環境のパス問題を回避するため、node_modules等をキャッシュ対象外にする
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    devOptions: {
      enabled: false, // 開発中にService Workerが動くと混乱するため、まずはfalseを推奨
    }
  }
})