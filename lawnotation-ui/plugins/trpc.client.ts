import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client'
import type { AppRouter } from '~/server/trpc/routers'
export default defineNuxtPlugin(() => {
  /**
   * createTRPCNuxtClient adds a `useQuery` composable
   * built on top of `useAsyncData`.
   */
  const client = createTRPCNuxtClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        async headers() {
          const supabase = useSupabaseClient();
          const session = await supabase.auth.getSession();

          return {
            authorization: `Bearer ${session.data.session?.access_token}`,
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