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
      // A statement takes at most 65534 parameters; six columns a row.
      const columns = ["label", "assignment_id", "start_index", "end_index", "text", "origin"] as const;
      const rowsPerInsert = Math.floor(65534 / columns.length);
      for (let i = 0; i < input.annotations.length; i += rowsPerInsert) {
        await ctx.sql`
          INSERT INTO annotations ${ctx.sql(input.annotations.slice(i, i + rowsPerInsert), columns)}
        `;
      }

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
      if (input.assignment_ids.length)
        await ctx.sql`
          UPDATE assignments SET status = ${input.status}
          WHERE id IN ${ctx.sql(input.assignment_ids)}
        `;

      return true;
    }),
});

export type HookRouter = typeof hookRouter;
