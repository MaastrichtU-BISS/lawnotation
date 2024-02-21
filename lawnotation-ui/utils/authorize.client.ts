import type { _AsyncData } from "nuxt/dist/app/composables/asyncData";
import type { AppRouter } from "~/server/trpc/routers";
import { createTRPCNuxtClient } from "trpc-nuxt/client";

// type DecoratedRouter = ReturnType<typeof createTRPCNuxtClient<AppRouter>>
type DecoratedRouter = AppRouter["_def"]["record"];

export const authorizeClient: <TRouter extends keyof DecoratedRouter>(
  entities: Array<
      | [TRouter, string | number, string]
      | [TRouter, string | number]
    >
) => void = async (entities) => {
  const { $trpc } = useNuxtApp();

  const pageObject: Record<string, object> = {};

  for (const [router, identifier, endpoint = 'findById'] of entities) {
    // @ts-expect-error
    if (!$trpc[router] || !$trpc[router][endpoint])
      throw createError({
        statusCode: 500,
        message: "Sorry, something went wrong!",
      });
    // @ts-expect-error
    const query = await $trpc[router][endpoint].useQuery(identifier);
    if (query.error.value) {
      const code = query.error.value.data?.httpStatus
        ? query.error.value.data.httpStatus
        : 404;
      const msg = query.error.value.message;
      if (process.client) {
        const app = useNuxtApp();
        if (app.payload.serverRendered && !app.isHydrating)
          app.$toast.error("The requested page is not found");
      }

      return createError({ statusCode: code, message: msg });
    }
    pageObject[router] = query.data.value;
  }

  const $page = usePage();
  $page.value = pageObject;
};
