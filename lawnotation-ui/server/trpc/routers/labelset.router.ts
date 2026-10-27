import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import type { Labelset } from "~/types";
import { labelsetEditorOrAnnotatorAuthorizer } from "../authorizers";
import { validateLabelset } from "vue-labelset-editor/model";
import { lockedNamesChanged } from "~/server/utils/labelset_lock";

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
      let query = ctx.supabase.from("labelsets").select().eq("editor_id", ctx.user.id);
      if (input.range) query = query.range(input.range[0], input.range[1]);
      if (input.filter) query = query.match(input.filter);

      const { data, error } = await query;

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.find: ${error.message}`,
        });
      return data as Labelset[];
    }),

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        labelsetEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      const { data, error, count } = await ctx.supabase
        .from("labelsets")
        .select()
        .eq("id", id)
        .single();

      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.findById: ${error.message}`,
        });
      return data as Labelset;
    }),

  create: protectedProcedure
    .input(ZLabelsetFields)
    .mutation(async ({ ctx, input }) => {
      assertValid(input);
      const { data, error } = await ctx.supabase
        .from("labelsets")
        .insert({...input, editor_id: ctx.user.id})
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.create: ${error.message}`,
        });
      return data as Labelset;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZLabelsetFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: current } = await ctx.supabase
        .from("labelsets")
        .select("name, desc, labels, relation_labels")
        .eq("id", input.id)
        .eq("editor_id", ctx.user.id)
        .single();
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      const before = current as z.infer<typeof ZLabelsetFields>;
      const after = { ...before, ...input.updates };
      assertValid(after);

      const { count } = await ctx.supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("labelset_id", input.id);
      const locked = count ? lockedNamesChanged(before, after) : null;
      if (locked) throw new TRPCError({ code: "BAD_REQUEST", message: locked });

      const { data, error } = await ctx.supabase
        .from("labelsets")
        .update(input.updates)
        .eq("id", input.id)
        .eq("editor_id", ctx.user.id)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.update: ${error.message}`,
        });
      return data as Labelset;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("labelsets")
        .delete()
        .eq("id", input)
        .eq("editor_id", ctx.user.id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in labelsets.delete: ${error.message}`,
        });
      return true;
    }),
});

export type LabelsetRouter = typeof labelsetRouter;
