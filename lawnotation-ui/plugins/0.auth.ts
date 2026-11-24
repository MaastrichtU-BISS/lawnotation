// Loads the signed-in user before route middleware runs. On the server it reads
// the session cookie; the result travels to the browser in the Nuxt payload.
export default defineNuxtPlugin(async () => {
  const loaded = useState<boolean>("auth-user-loaded", () => false);
  if (loaded.value) return;
  await refreshAuthUser().catch(() => (useAuthUser().value = null));
  loaded.value = true;
});
