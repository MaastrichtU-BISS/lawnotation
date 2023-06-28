import * as Toast from "vue-toastification";

declare module '#app' {
  function useNuxtApp(): NuxtApp & { $toast: ReturnType<typeof Toast.useToast> };
}

type ServerAuthContext = {
  authenticated: boolean;
  user: User | null;
}

declare module 'h3' {
  interface H3EventContext {
    auth: ServerAuthContext;
  }
}