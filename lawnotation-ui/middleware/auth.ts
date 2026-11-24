export default defineNuxtRouteMiddleware((to) => {
  const user = useAuthUser();
  if (!user.value) return signIn(to.fullPath);
});
