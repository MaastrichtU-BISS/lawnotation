import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  disabledProcedure,
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

const hookAuthorizer = middleware((opts) => {
  // opts.ctx.hooksKey
  return opts.next();
});

export const hookRouter = router({
  afterMLPredict: disabledProcedure
    .input(
      z.object({
        annotations: z.array(
          z.object({
            label: z.string(),
            assignment_id: z.number().int(),
            start_index: z.number().int(),
            end_index: z.number().int(),
            text: z.string(),
            origin: z.nativeEnum(Origins),
            ls_id: z.string(),
          })
        )
      })
    )
    // .use(hookAuthorizer)
    .mutation(async ({ ctx, input }) => {
      const annotations = await ctx.supabase
        .from("annotations")
        .insert(input.annotations)
        .select();

      return true;
    }),

  afterMLStatusChanged: disabledProcedure
    .input(
      z.object({
        assignment_ids: z.array(z.number().int()),
        status: z.union([z.literal("pre-annotated"), z.literal("failed")]),
      })
    )
    // .use(hookAuthorizer)
    .mutation(async ({ ctx, input }) => {
      input.assignment_ids.forEach(async (id: number) => {
        const assignment = await ctx.supabase
          .from("assignments")
          .update({ status: input.status })
          .eq("id", id)
          .select()
          .single();
      });

      return true;
    }),
});

export type HookRouter = typeof hookRouter;
