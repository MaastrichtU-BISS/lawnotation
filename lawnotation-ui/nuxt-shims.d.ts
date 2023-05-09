import * as Toast from "vue-toastification";

declare module '#app' {
  function useNuxtApp(): NuxtApp & { $toast: ReturnType<typeof Toast.useToast> };
}