import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import { Publication, PublicationStatus } from "~/types";
import type { Context } from "../context";

const ZPublicationFields = z.object({
  editor_id: z.string(),
  status: z.union([z.literal(PublicationStatus.PUBLISHED), z.literal(PublicationStatus.UNPUBLISHED)]),
  task_name: z.string(),
  task_description: z.string(),
  labels_name: z.string(),
  labels_description: z.string(),
  file_url: z.string(),
  guidelines_url: z.string(),
  author: z.string(),
  contact: z.string(),
  documents: z.number().int(),
  assignments: z.number().int(),
  annotators: z.number().int(),
  annotations: z.number().int(),
  relations: z.number().int()
});

const seePublicationAuthorizer = async (
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

const editPublicationAuthorizer = async (
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

  return editor.count! > 0;
  
};

export const publicationRouter = router({

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        seePublicationAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
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

  findByIdEdit: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        editPublicationAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
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
          message: `Error in publications.findByIdEdit: ${error.message}`,
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
    .use((opts) =>
      authorizer(opts, () =>
        editPublicationAuthorizer(opts.input.id, opts.ctx.user.id, opts.ctx)
        )
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
      .use((opts) =>
      authorizer(opts, () =>
        editPublicationAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
        )
    )
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
