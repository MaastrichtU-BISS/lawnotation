import { AsyncData } from '#app';
import { parseParametersFromURL } from '@supabase/gotrue-js/src/lib/helpers'
import { TRPCClientError } from '@trpc/client';
import { DefaultErrorShape } from '@trpc/server';

export default defineNuxtRouteMiddleware(async (to, from) => {

    /**
     * Auth Middleware Strategy:
     * 
     * 1. Definitions.
     * First, for each route, a (lazy) tRPC query will be define that represents
     * the current route, with parameters.
     * 
     * 2. Error handling (403, 404)
     * Next, 
     */

    const user = useSupabaseUser();
    
    if(user.value == null) {
        // if (process.client && window.location.hash.length > 0)
        //     return navigateTo('/auth/validate'})
        // else
        return navigateTo('/auth/login');
    }
    

})