import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  middleware,
  protectedProcedure,
  publicProcedure,
  router,
} from "~/server/trpc";
import type { Context } from "../context";
import type { PostgrestError } from "@supabase/supabase-js";
import { appRouter } from ".";
import type { DocFormat, Doc } from "~/types/archive";

const config = useRuntimeConfig();

const archiveAuthorizer = middleware((opts) => {
  // opts.ctx.hooksKey
  return opts.next();
});

export const archiveRouter = router({
  getXMLFromRechtspraak: publicProcedure
    .input(z.object({ eclis: z.array(z.string())}))
    // .use(archiveAuthorizer)
    .query(async ({ ctx, input }) => {
      
      try {
        const response = await fetch(`${config.public.mlBackendURL}/archives/search/rechtspraak/`, {
          method: "POST",
          body: JSON.stringify(input)
        });

        const xmls = await response.json();
        return xmls as string[];

      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in archive.getXMLFromRechtspraak: ${error.message}`,
        });
      }
    }),
});

export type ArchiveRouter = typeof archiveRouter;
