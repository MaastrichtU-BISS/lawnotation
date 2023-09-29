import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client'
import type { AppRouter } from '~/server/trpc/routers'

export default defineNuxtPlugin(async (app) => {

  // if (process.server)
  //   const serverSupabaseClient = (await import('#supabase/server')).serverSupabaseClient;
  // const supabase = process.server ? serverSupabaseClient(useRequestEvent()) : useSupabaseClient();
  
  // const cookie = useCookie('sb-access-token');
  const cookie = useSupabaseToken();
  
  const client = createTRPCNuxtClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        async headers() {
          return cookie.value 
            ? { authorization: `Bearer ${cookie.value}` } 
            : {}
        },
      }),
    ]
  })
  return {
    provide: {
      trpc: client,
    },
  }
})