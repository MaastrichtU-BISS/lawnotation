// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  runtimeConfig: {
    mailtrapToken: process.env.MAILTRAP_TOKEN,
    public: {
      baseURL:
        process.env.NODE_ENV === "production"
          ? "https://app.lawnotation.org"
          : "http://localhost:3000",
    },
  },
  modules: ["@nuxtjs/supabase", "@nuxtjs/tailwindcss", 'nuxt-primevue'],
  primevue: {
    options: {
      unstyled: true
    },
    importPT: { as: "Lara", from: "@/presets/lara" }
  },
  build: {
    transpile: ['trpc-nuxt'],
  },
  css: ["@/assets/styles/main.scss", "@vueform/multiselect/themes/default.css", 'primeicons/primeicons.css'],
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
  },
  vite: {
    optimizeDeps: { exclude: ["/lawnotation-ui/utils/enums.ts", "/lawnotation-ui/utils/guidance.ts"] },
    vue: {
      script: {
        defineModel: true,
        propsDestructure: true,
      },
    },
  }
});
