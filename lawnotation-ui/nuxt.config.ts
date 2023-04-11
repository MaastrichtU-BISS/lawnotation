// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiUrl: process.env.SUPABASE_LAWNOTATION_URL || "",
      apiAnonKey: process.env.SUPABASE_LAWNOTATION_ANON_KEY || ""
    }
  },
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
