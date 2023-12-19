import { loggerLink } from '@trpc/client';
import { observable, tap } from '@trpc/server/observable';
import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client'
import type { AppRouter } from '~/server/trpc/routers'

export default defineNuxtPlugin(async (app) => {

  const sbclient = useSupabaseClient();
  
  // const token = (await sbclient.auth.sgetSession()).data.session?.access_token ?? null
  
  const session = (await sbclient.auth.getSession()).data.session;
  const token = session?.access_token
  
  const client = createTRPCNuxtClient<AppRouter>({
    links: [
      // this link will check if the reponse is a UNAUTHORIZED error, after which it 
      // will clear the session and redirect back to the login page.
      // An example: https://github.com/trpc/trpc/discussions/2036#discussioncomment-4800324
      (() => ({next, op}) => {
        return observable((observer) => {
          return next(op).subscribe({
            next: (val) => observer.next(val),
            error(err) {
              observer.error(err)
              if (err.data?.code == "UNAUTHORIZED" && process.client) {
                sbclient.auth.signOut().then(() => {
                  navigateTo('/auth/login');
                  useNuxtApp().$toast.info("You have been signed out. Please sign-in again.")
                });
              }
            },
            complete: () => observer.complete(),
          })
        })
      }),
      
      httpBatchLink({
        url: '/api/trpc',
        async headers() {
          return token 
            ? { authorization: `Bearer ${token}` } 
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