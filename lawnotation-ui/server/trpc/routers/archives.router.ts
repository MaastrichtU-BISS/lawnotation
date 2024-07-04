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

const archiveAuthorizer = middleware((opts) => {
  // opts.ctx.hooksKey
  return opts.next();
});

export const archiveRouter = router({
  getXMLFromRechtspraak: publicProcedure
    .input(z.array(z.string()))
    // .use(archiveAuthorizer)
    .query(async ({ ctx, input }) => {
      
      const promises: Promise<any>[] = [];
      input.map((ecli: string) => {
        promises.push(fetch(`https://data.rechtspraak.nl/uitspraken/content?id=${ecli}&return=DOC`));
      });

      const responses = await Promise.all(promises);

      const promisesXMLS: Promise<string>[] = [];

      responses.map(r => {
        promisesXMLS.push(r.text());
      });

      const xmls = await Promise.all(promisesXMLS);

      return xmls;
    }),
});

export type ArchiveRouter = typeof archiveRouter;
