// https://nuxt.com/docs/api/configuration/nuxt-config
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
      exclude: [
        "/lawnotation-ui/utils/enums.ts", 
        "/lawnotation-ui/utils/guidance.ts"
      ]
    },
    vue: {
      script: {
        defineModel: true,
        propsDestructure: true,
      },
    },
    build: {
      rollupOptions: {
        external: (id) => {
          // Externalize all server files and dependencies during client build
          return id.includes('/server/') || id.includes('postgres') || id.includes('nodemailer')
        }
      }
    }
  },

  compatibilityDate: "2024-10-01"
});