// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      baseURL: 'https://lawnotation.vercel.app'
    }
  },
  modules: ['@nuxtjs/supabase'],
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
