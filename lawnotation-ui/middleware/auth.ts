
export default defineNuxtRouteMiddleware((to, from) => {
    const user = useSupabaseUser();
    console.log(user.value)
})