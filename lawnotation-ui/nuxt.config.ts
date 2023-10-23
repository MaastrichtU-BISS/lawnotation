// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      baseURL:
        process.env.NODE_ENV === "production"
          ? "https://lawnotation.vercel.app"
          : "http://localhost:3000",
    },
  },
  modules: ["@nuxtjs/supabase", "@nuxtjs/tailwindcss"],
  build: {
    transpile: ['trpc-nuxt']
  },
  css: ["@/assets/styles/main.scss", "@vueform/multiselect/themes/default.css"],
  supabase: {
    redirect: false,
    // redirectOptions: {
    //   login: '/auth/login',
    //   callback: '/auth/validate',
    //   exclude: ['/auth/validate'],
    // },
    clientOptions: {
      auth: {
        flowType: 'implicit',
        detectSessionInUrl: true,
      }
    }
  }
});
