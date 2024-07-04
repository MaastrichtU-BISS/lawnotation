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
import type { Annotation, Assignment } from "~/types";
import { Origins } from "~/utils/enums";

const archiveAuthorizer = middleware((opts) => {
  // opts.ctx.hooksKey
  return opts.next();
});

export const archiveRouter = router({
  getXMLFromRechtspraak: publicProcedure
    .input(z.array(z.string()))
    // .use(hookAuthorizer)
    .query(async ({ ctx, input }) => {
      
      const promises: Promise<any>[] = [];
      input.map((ecli: string) => {
        promises.push(fetch(`https://data.rechtspraak.nl/uitspraken/content?id=${ecli}&return=DOC`));
      });

      const responses = await Promise.all(promises);

      const promisesText: Promise<string>[] = [];

      responses.map(r => {
        promisesText.push(r.text());
      });

      const texts = await Promise.all(promisesText);

      return texts;
    }),
});

export type ArchiveRouter = typeof archiveRouter;
