import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import { type Publication, PublicationStatus } from "~/types";
import type { Context } from "../context";
import { publicationEditorAuthorizer, publicationViewerAuthorizer } from "../authorizers";

const ZPublicationFields = z.object({
  // editor_id: z.string(),
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

// The one row a query must return, as PostgREST's .single() demanded.
function one<T>(rows: readonly T[]): T {
  if (rows.length !== 1) throw new Error(`expected one row, found ${rows.length}`);
  return rows[0]!;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const publicationById = async (ctx: Context, id: number) =>
  one(await ctx.sql<Publication[]>`SELECT * FROM publications WHERE id = ${id}`);

export const publicationRouter = router({

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        publicationViewerAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      try {
        return await publicationById(ctx, id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in publications.findById: ${message(error)}`,
        });
      }
    }),

  findByIdEdit: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        publicationEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      try {
        return await publicationById(ctx, id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in publications.findByIdEdit: ${message(error)}`,
        });
      }
    }),
    
  create: protectedProcedure
    .input(ZPublicationFields)
    .mutation(async ({ ctx, input }) => {
      const row: Record<string, unknown> = { ...input, editor_id: ctx.user.id };
      try {
        return one(
          await ctx.sql<Publication[]>`
            INSERT INTO publications ${ctx.sql(row, ...Object.keys(row))}
            RETURNING *
          `
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in publications.create: ${message(error)}`,
        });
      }
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
        publicationEditorAuthorizer(opts.input.id, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = input.updates;
      const columns = Object.keys(updates).filter((column) => updates[column] !== undefined);
      try {
        return columns.length
          ? one(
              await ctx.sql<Publication[]>`
                UPDATE publications SET ${ctx.sql(updates, ...columns)}
                WHERE id = ${input.id}
                RETURNING *
              `
            )
          : await publicationById(ctx, input.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in publications.update: ${message(error)}`,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        publicationEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.sql`DELETE FROM publications WHERE id = ${input}`;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in publications.delete: ${message(error)}`,
        });
      }
      return true;
    }),
});

export type PublicationRouter = typeof publicationRouter;
