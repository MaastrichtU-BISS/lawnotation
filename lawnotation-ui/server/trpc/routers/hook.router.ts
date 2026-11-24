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
import { appRouter } from ".";
import type { Annotation, Assignment } from "~/types";
import { Origins } from "~/utils/enums";
import { insertPredictedAnnotations, setAssignmentsStatus } from "~/server/db/queries/ml_models";

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
          })
        )
      })
    )
    // .use(hookAuthorizer)
    .mutation(async ({ ctx, input }) => {
      await insertPredictedAnnotations(ctx.sql, input.annotations);

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
      await setAssignmentsStatus(ctx.sql, input.assignment_ids, input.status);

      return true;
    }),
});

export type HookRouter = typeof hookRouter;
