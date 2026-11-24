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

  // Every value can be set at runtime with its NUXT_ variable, e.g.
  // NUXT_PUBLIC_BASE_URL, NUXT_AUTH_ISSUER, NUXT_SMTP_URL (see .env.example).
  runtimeConfig: {
    smtpUrl: process.env.SMTP_URL,
    iaaServiceUrl:
      process.env.IAA_SERVICE_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://iaa.lawnotation.org"
        : "http://127.0.0.1:8080"),
    iaaApiKey: process.env.IAA_API_KEY,
    // Server-only: never expose this through `public` or a VITE_ variable.
    citationsApiKey: process.env.CITATIONS_API_KEY,
    // Ask search engines to stay away (X-Robots-Tag and robots.txt), for
    // deployments that are not the public app. NUXT_NOINDEX=true.
    noindex: process.env.NOINDEX === "true",
    // Sign-in through Keycloak (realm lawnotation). Server-only.
    auth: {
      issuer: process.env.AUTH_ISSUER || "https://auth.lawnotation.org/realms/lawnotation",
      clientId: process.env.AUTH_CLIENT_ID || "lawnotation",
      clientSecret: process.env.AUTH_CLIENT_SECRET || "",
      sessionSecret: process.env.AUTH_SESSION_SECRET || "",
    },
    public: {
      mlBackendURL: process.env.MLBACKEND_URL,
      // Where this deployment is reachable; used for sign-in redirects and
      // links in emails.
      baseURL:
        process.env.BASE_URL ||
        (process.env.NODE_ENV === "production"
          ? "https://app.lawnotation.org"
          : "http://localhost:3000"),
    },
  },

  modules: ["@nuxtjs/tailwindcss", "@primevue/nuxt-module"],

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
    // vue-legal-query-builder ships precompiled render functions that import
    // "vue". Left external, the server bundle would load a second copy of Vue
    // for it, which never sees the current component's scope id, so the
    // server-rendered form had no data-v-* attributes and its scoped CSS
    // matched nothing until a client-side render.
    // vue-countup-v3 is "type": "module" with a UMD file as "main", which Node
    // cannot import from node_modules; bundling it avoids that.
    transpile: ["trpc-nuxt", "vue-legal-query-builder", "vue-countup-v3"],
  },

  css: ["@/assets/styles/main.scss", "epic-spinners/css", "legal-annotation-kit/style.css"],

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
      "/api/iaa/**": {
        headers: {
          Connection: "keep-alive",
        },
      },
    },
  },

  compatibilityDate: "2024-10-01",
});
