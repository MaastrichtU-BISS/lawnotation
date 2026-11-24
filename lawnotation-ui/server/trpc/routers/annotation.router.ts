import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Sql } from "~/server/db/client";
import { protectedProcedure, disabledProcedure, router, authorizer } from "~/server/trpc";
import {
  annotationById,
  annotationsOfAssignment,
  annotationsOfTask,
  annotationsOfTaskAndDocument,
  annotationsOfTaskDocumentLabelAndAnnotators,
  deleteAnnotation,
  findAnnotations,
  insertAnnotations,
  updateAnnotation,
} from "~/server/db/queries/annotations";
import { one } from "~/server/db/queries/helpers";
import type { Annotation } from "~/types";
import { Origins } from "~/utils/enums";
import { assignmentEditorOrAnnotatorAuthorizer, assignmentsEditorOrAnnotatorAuthorizer, taskEditorAuthorizer } from "../authorizers";
import { TRPCForbidden } from "../errors"

const ZAnnotationFields = z.object({
  label: z.string(),
  assignment_id: z.number().int(),
  start_index: z.number().int(),
  end_index: z.number().int(),
  text: z.string(),
  origin: z.nativeEnum(Origins).nullable().optional(),
  metadata: z.string().nullable().optional(),
  confidence_rating: z.number().int().min(0).max(5).optional(),
  // A tag on the whole document, in a document-level or hybrid task.
  kind: z.enum(["span", "document"]).optional(),
});

export const annotationRouter = router({
  /* General Crud Definitions */
  find: disabledProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZAnnotationFields.partial().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await findAnnotations(ctx.sql, input.filter, input.range);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.find: ${(error as Error).message}`,
        });
      }
    }),

  findById: disabledProcedure
    .input(z.number().int())
    .query(async ({ ctx, input }) => {
      let rows;
      try {
        rows = await annotationById(ctx.sql, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.findById: ${(error as Error).message}`,
        });
      }
      return one(rows, "Error in annotation.findById");
    }),

  findByAssignment: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: assignment_id }) => {
      try {
        return await annotationsOfAssignment(ctx.sql, assignment_id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.findByAssignment: ${(error as Error).message}`,
        });
      }
    }),

  create: disabledProcedure
    .input(ZAnnotationFields)
    .mutation(async ({ ctx, input }) => {
      let rows;
      try {
        rows = await insertAnnotations(ctx.sql, [input]);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.create: ${(error as Error).message}`,
        });
      }
      return one(rows, "Error in annotation.create");
    }),

  createMany: protectedProcedure
    .input(z.array(ZAnnotationFields))
    .mutation(async ({ ctx, input }) => {

      const access = await assignmentsEditorOrAnnotatorAuthorizer(
        input.map(x => x.assignment_id), ctx.user.id, ctx
      )
      if (!access) {
        throw TRPCForbidden()
      }

      try {
        // One transaction, so the annotations are all stored or none are, as
        // when this was a single insert. Rows come back in the order given.
        // postgres.js types a transaction without the call signature it has
        // at runtime; the cast restores it.
        return await ctx.sql.begin((transaction) =>
          insertAnnotations(transaction as unknown as Sql, input)
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.createMany: ${(error as Error).message}`,
        });
      }
    }),

  update: disabledProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZAnnotationFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let rows;
      try {
        rows = await updateAnnotation(ctx.sql, input.id, input.updates);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.update: ${(error as Error).message}`,
        });
      }
      return one(rows, "Error in annotation.update");
    }),

  delete: disabledProcedure
    .input(z.number().int())
    .query(async ({ ctx, input }) => {
      try {
        await deleteAnnotation(ctx.sql, input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.delete: ${(error as Error).message}`,
        });
      }
      return true;
    }),

  /* Specific Implementations */

  findAnnotationsByTaskAndDocument: protectedProcedure
    .input(
      z.object({
        task_id: z.number(),
        document_id: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await annotationsOfTaskAndDocument(ctx.sql, input.task_id, input.document_id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAnnotationsByTaskAndDocumentAndLabel: ${(error as Error).message}`,
        });
      }
    }),

  findAnnotationsByTaskAndDocumentAndLabelsAndAnnotators: disabledProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        document_id: z.number().int(),
        label: z.string(),
        annotators: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return (await annotationsOfTaskDocumentLabelAndAnnotators(
          ctx.sql,
          input.task_id,
          input.document_id,
          input.label,
          input.annotators
        )) as unknown as Annotation[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAnnotationsByTaskAndDocumentAndLabel: ${(error as Error).message}`,
        });
      }
    }),

  findAnnotationsByTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      try {
        return (await annotationsOfTask(ctx.sql, task_id)) as unknown as Annotation[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAnnotationsByTaskAndDocumentAndLabel: ${(error as Error).message}`,
        });
      }
    }),
});

export type AnnotationRouter = typeof annotationRouter;
