import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import { PublicationStatus } from "~/types";
import * as Pub from "~/server/db/queries/publications";
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

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
        return await Pub.publicationById(ctx.sql, id);
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
        return await Pub.publicationById(ctx.sql, id);
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
      try {
        return await Pub.insertPublication(ctx.sql, ctx.user.id, input);
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
      try {
        return await Pub.updatePublication(ctx.sql, input.id, input.updates);
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
        await Pub.deletePublication(ctx.sql, input);
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
