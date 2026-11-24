export default defineNuxtRouteMiddleware((to) => {
  const user = useAuthUser();
  if (!user.value)
    return navigateTo({ path: "/auth/login", query: to.fullPath === "/" ? {} : { returnTo: to.fullPath } });
});
