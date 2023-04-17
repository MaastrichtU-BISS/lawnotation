
export default defineNuxtRouteMiddleware((to, from) => {
    const user = useSupabaseUser();
    const supabase = useSupabaseClient();
    
    if(user.value == null) { 
        abortNavigation();
        return navigateTo('/');
    }

    supabase.auth.onAuthStateChange((event, session) => {
        console.log(event, session)
        if (event == 'SIGNED_IN') {
            // return navigateTo('/');
        } else if(event == 'SIGNED_OUT') {
            return navigateTo('/');
        }
      });
})