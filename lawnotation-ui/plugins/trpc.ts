import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client'
import type { AppRouter } from '~/server/trpc/routers'

export default defineNuxtPlugin(async (app) => {

  // if (process.server)
  //   const serverSupabaseClient = (await import('#supabase/server')).serverSupabaseClient;
  // const supabase = process.server ? serverSupabaseClient(useRequestEvent()) : useSupabaseClient();
  
  const cookie = useCookie('sb-access-token');

  const client = createTRPCNuxtClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        async headers() {
          return {
            authorization: `Bearer ${cookie.value}`,
          };
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