import { observable } from '@trpc/server/observable';
import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client'
import type { AppRouter } from '~/types/trpc'

export default defineNuxtPlugin(() => {
  // Requests carry the session cookie (same origin); on the server the
  // incoming request's cookie is forwarded by trpc-nuxt.
  const client = createTRPCNuxtClient<AppRouter>({
    links: [
      // When the session has ended, send the user to sign in again.
      // An example: https://github.com/trpc/trpc/discussions/2036#discussioncomment-4800324
      (() => ({next, op}) => {
        return observable((observer) => {
          return next(op).subscribe({
            next: (val) => observer.next(val),
            error(err) {
              observer.error(err)
              if (err.data?.code == "UNAUTHORIZED" && import.meta.client) {
                (useNuxtApp() as any).$toast.info("You have been signed out. Please sign-in again.")
                location.href = `/api/auth/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
              }
            },
            complete: () => observer.complete(),
          })
        })
      }),

      httpBatchLink({
        url: '/api/trpc',
      }),
    ]
  })

  return {
    provide: {
      trpc: client,
    },
  }
})
