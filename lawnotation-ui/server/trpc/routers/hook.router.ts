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

const hookAuthorizer = middleware((opts) => {
  // opts.ctx.hooksKey
  return opts.next();
});

export const hookRouter = router({
  afterMLPredict: publicProcedure
    .input(
      z.object({
        annotations: z.array(
          z.object({
            label: z.string(),
            assignment_id: z.number().int(),
            start_index: z.number().int(),
            end_index: z.number().int(),
            text: z.string(),
            origin: z.union([
              z.literal("manual"),
              z.literal("imported"),
              z.literal("model"),
            ]),
            ls_id: z.string(),
          })
        ),
        assignment_ids: z.array(z.number().int()),
      })
    )
    // .use(hookAuthorizer)
    .mutation(async ({ ctx, input }) => {
      const annotations = await ctx.supabase
        .from("annotations")
        .insert(input.annotations)
        .select();

      input.assignment_ids.map(async (id: number) => {
        const assignment = await ctx.supabase
          .from("assignments")
          .update({ status: "pre-annotated" })
          .eq("id", id)
          .select()
          .single();
      });

      return true;
    }),
});

export type HookRouter = typeof hookRouter;
