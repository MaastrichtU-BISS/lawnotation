import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import { labelsetEditorOrAnnotatorAuthorizer } from "../authorizers";
import { validateLabelset } from "vue-labelset-editor/model";
import { lockedNamesChanged } from "~/server/utils/labelset_lock";
import type { Labelset } from "~/types";
import * as L from "~/server/db/queries/labelsets";

const ZLabelsetFields = z.object({
  name: z.string(),
  desc: z.string(),
  // editor_id: z.string(),
  labels: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
    })
  ),
  relation_labels: z.array(z.string()).nullable().optional(),
});

function assertValid(labelset: z.infer<typeof ZLabelsetFields>) {
  const issues = validateLabelset(labelset);
  if (issues.length)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: issues.map((i) => (i.index === undefined ? i.message : `${i.field} ${i.index + 1}: ${i.message}`)).join("; "),
    });
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const labelsetRouter = router({
  /* General Crud Definitions */
  find: protectedProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZLabelsetFields.partial().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return (await L.labelsetsOfEditor(ctx.sql, ctx.user.id, input.filter, input.range)) as Labelset[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.find: ${message(error)}`,
        });
      }
    }),

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        labelsetEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      try {
        return await L.labelsetById(ctx.sql, id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.findById: ${message(error)}`,
        });
      }
    }),

  create: protectedProcedure
    .input(ZLabelsetFields)
    .mutation(async ({ ctx, input }) => {
      assertValid(input);
      try {
        return await L.insertLabelset(ctx.sql, ctx.user.id, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.create: ${message(error)}`,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZLabelsetFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const current = await L.labelsetFieldsOfEditor(ctx.sql, input.id, ctx.user.id);
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      const before = current as z.infer<typeof ZLabelsetFields>;
      const after = { ...before, ...input.updates };
      assertValid(after);

      const count = await L.countTasksUsingLabelset(ctx.sql, input.id);
      const locked = count ? lockedNamesChanged(before, after) : null;
      if (locked) throw new TRPCError({ code: "BAD_REQUEST", message: locked });

      try {
        return await L.updateLabelsetOfEditor(ctx.sql, input.id, ctx.user.id, input.updates);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.update: ${message(error)}`,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input }) => {
      try {
        await L.deleteLabelsetOfEditor(ctx.sql, input, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.delete: ${message(error)}`,
        });
      }
      return true;
    }),
});

export type LabelsetRouter = typeof labelsetRouter;
