import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import type { Publication } from "~/types";
import type { Context } from "../context";

const ZPublicationFields = z.object({
  editor_id: z.string(),
  status: z.union([z.literal("published"), z.literal("unpublished")]),
  task_name: z.string(),
  labels_name: z.string(),
  file_url: z.string(),
  author: z.string(),
  contact: z.string(),
});

const publicationAuthorizer = async (
  publication_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await ctx.supabase
    .from("publications")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("id", publication_id)
    .eq("editor_id", user_id);

  if(editor.count) return true;

  const everyone = await ctx.supabase
    .from("publications")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("id", publication_id)
    .eq("status", "published");

    return everyone.count! > 0;
  
};

export const publicationRouter = router({
  /* General Crud Definitions */
  // find: protectedProcedure
  //   .input(
  //     z.object({
  //       range: z.tuple([z.number().int(), z.number().int()]).optional(),
  //       filter: ZTaskFields.partial().optional(),
  //     })
  //   )
  //   .query(async ({ ctx, input }) => {
  //     let query = ctx.supabase.from("tasks").select();
  //     if (input.range) query = query.range(input.range[0], input.range[1]);
  //     if (input.filter) query = query.match(input.filter);

  //     const { data, error } = await query;

  //     if (error)
  //       throw new TRPCError({
  //         code: "INTERNAL_SERVER_ERROR",
  //         message: `Error in tasks.find: ${error.message}`,
  //       });
  //     return data as Task[];
  //   }),

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        publicationAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      const { data, error, count } = await ctx.supabase
        .from("publications")
        .select()
        .eq("id", id)
        .single();

      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in publications.findById: ${error.message}`,
        });
      return data as Publication;
    }),

  create: protectedProcedure
    .input(ZPublicationFields)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("publications")
        .insert(input)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in publications.create: ${error.message}`,
        });
      return data as Publication;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZPublicationFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("publications")
        .update(input.updates)
        .eq("id", input.id)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in publications.update: ${error.message}`,
        });
      return data as Publication;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("publications")
        .delete()
        .eq("id", input);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in publications.delete: ${error.message}`,
        });
      return true;
    }),
});

export type PublicationRouter = typeof publicationRouter;
