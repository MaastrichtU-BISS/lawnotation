// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      baseURL: process.env.NODE_ENV === 'production' ? 'https://lawnotation.vercel.app' : 'http://localhost:3000'
    }
  },
  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  css: [
    '@/style/main.scss',
  ]
})
