// https://nuxt.com/docs/api/configuration/nuxt-config
import Lara from "@primeuix/themes/lara";
import { definePreset } from "@primeuix/themes";

const customPreset = definePreset(Lara, {
  semantic: {
    primary: {
      // 'primary': '#0D5984',
      // 'primary-low': '#0b4b6f',
      // 'primary-high': '#236B95',
      50: "#bbe4fb",
      100: "#AAE0FF",
      200: "#86BCED",
      300: "#629AC9",
      400: "#3D78A6",
      500: "#0D5984",
      600: "#0b4e75",
      700: "#094568",
      800: "#083b5a",
      900: "#06314b",
      950: "#05283e",
    },
  },
  components: {
    tabs: {
      tablist: {
        borderColor: "{surface.300}",
        borderWidth: "0 0 1px 0",
      },
      tab: {
        color: "{surface.600}",
        hoverColor: "{primary.300}",
        activeColor: "{primary.700}",
        borderWidth: "0 0 2px 0",
        borderColor: "transparent",
        activeBorderColor: "{primary.600}",
        padding: "12px 16px",
      },
      colorScheme: {
        light: {
          tab: {
            background: "white",
            hoverBackground: "white",
            activeBackground: "white",
          },
        },
      },
      activeBar: {
        height: "0",
        background: "transparent",
      },
      tabpanel: {
        padding: "16px 0 0 0",
      },
    },
  },
});

export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          defer: true,
          src: "https://umami-biss-um.vercel.app/script.js",
          "data-website-id": "0d643ede-ed67-4311-a8c0-6db0edc96f64",
          "data-domains": "app.lawnotation.org",
        },
      ],
    },
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

  modules: ["@nuxtjs/supabase", "@nuxtjs/tailwindcss", "@primevue/nuxt-module"],

  primevue: {
    options: {
      // unstyled: true,
      theme: {
        preset: customPreset,
        options: {
          darkModeSelector: false || "none",
        },
      },
    },
  },

  build: {
    transpile: ["trpc-nuxt"],
  },

  css: ["@/assets/styles/main.scss"],

  supabase: {
    redirect: false,
    // redirectOptions: {
    //   login: '/auth/login',
    //   callback: '/auth/validate',
    //   exclude: ['/auth/validate'],
    // },
    clientOptions: {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
      },
    },
  },

  vite: {
    optimizeDeps: {
      exclude: [],
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
      asyncContext: true,
    },
    routeRules: {
      "/api/metrics/**": {
        headers: {
          Connection: "keep-alive",
        },
      },
    },
  },

  compatibilityDate: "2024-10-01",
});
