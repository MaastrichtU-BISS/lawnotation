
export default defineNuxtRouteMiddleware((to, from) => {
    const user = useSupabaseUser();
    const supabase = useSupabaseClient();
    
    console.log('YY',user.value?.id)

    if(user.value == null) { 
        // abortNavigation();
        return navigateTo('/');
    }

    supabase.auth.onAuthStateChange((event, session) => {
        // console.log(event, session, user.value)
        if (event == 'SIGNED_IN') {
            // return navigateTo('/');
        } else if(event == 'SIGNED_OUT') {
            return navigateTo('/');
        }
      });
})