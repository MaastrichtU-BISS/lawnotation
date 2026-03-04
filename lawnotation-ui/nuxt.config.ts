// https://nuxt.com/docs/api/configuration/nuxt-config
import Lara from '@primeuix/themes/lara';

export default defineNuxtConfig({
  app: {
    head: {
      script: [{
        defer: true,
        src: "https://umami-biss-um.vercel.app/script.js",
        "data-website-id": "0d643ede-ed67-4311-a8c0-6db0edc96f64",
        "data-domains": "app.lawnotation.org"
      }]
    }
  },
  devtools: { enabled: false },

  runtimeConfig: {
    smtpUrl: process.env.SMTP_URL,
    public: {
      mlBackendURL: process.env.MLBACKEND_URL,
      baseURL:
        process.env.NODE_ENV === "production"
          ? "https://app.lawnotation.org"
          : "http://localhost:3000",
    },
  },

  modules: ["@nuxtjs/supabase", "@nuxtjs/tailwindcss", '@primevue/nuxt-module'],

  primevue: {
    options: {
      // unstyled: true,
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: false || 'none',
        }
      }
    },
  },

  build: {
    transpile: ['trpc-nuxt'],
  },

  css: ["@/assets/styles/main.scss", 'primeicons/primeicons.css'],

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
    optimizeDeps: {
      exclude: []
    },
    vue: {
      script: {
        defineModel: true,
        propsDestructure: true,
      },
    },
  },

  nitro: {
    experimental: {
      asyncContext: true
    },
    routeRules: {
      '/api/metrics/**': {
        headers: {
          'Connection': 'keep-alive'
        }
      }
    }
  },

  compatibilityDate: "2024-10-01"
});