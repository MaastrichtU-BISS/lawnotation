import Toast, { useToast } from "vue-toastification";
import "vue-toastification/dist/index.css";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Toast)

  // from: https://github.com/Maronato/vue-toastification/issues/374#issuecomment-1527876533
  return { provide: { toast: useToast() } }
});