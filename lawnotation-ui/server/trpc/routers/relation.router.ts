import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { ZRelationLabel } from '~/server/utils/relation_label'
import type { Sql } from "~/server/db/client";
import { protectedProcedure, disabledProcedure, router, authorizer } from '~/server/trpc'
import type { AnnotationRelation } from '~/types';
import {
  insertDocumentRelationInTask,
  insertRelations,
  relationById,
  relationsFromAnnotations,
  relationsOfTask,
} from '~/server/db/queries/relations';
import { annotationEditorOrAnnotatorAuthorizer } from '../authorizers/annotation.auth';
import { TRPCForbidden } from '../errors';
import { taskEditorAuthorizer } from '../authorizers';

const ZRelationDirection = z.enum(["bi", "left", "right"])
const ZRelationFields = z.object({
  // id: z.number,
  from_id: z.number().int(),
  to_id: z.number().int(),
  direction: ZRelationDirection,
  labels: z.array(ZRelationLabel)
});

export const relationRouter = router({
  createMany: protectedProcedure
    .input(
      z.array(ZRelationFields)
    )
    .mutation(async ({ ctx, input }) => {

      // authorization
      const annotation_ids: number[] = [];
      for (const {from_id, to_id} of input) {
        if (!annotation_ids.includes(from_id))
          annotation_ids.push(from_id)
        if (!annotation_ids.includes(to_id))
          annotation_ids.push(to_id)
      }

      for (const annotation_id of annotation_ids) {
        const access = await annotationEditorOrAnnotatorAuthorizer(annotation_id, ctx.user.id, ctx)
        if (!access) {
          throw TRPCForbidden()
        }
      }

      try {
        // One transaction, so the relations are all stored or none are, as
        // when this was a single insert. postgres.js types a transaction
        // without the call signature it has at runtime; the cast restores it.
        return await ctx.sql.begin((transaction) =>
          insertRelations(transaction as unknown as Sql, input)
        );
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in create: ${(error as Error).message}`});
      }
    }),

  /**
   * Document-level links, for task import. Both ends must be assignments of
   * the same task and annotator, and the caller must edit that task; rows that
   * break the first rule are skipped.
   */
  createDocumentRelations: protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        relations: z.array(
          z.object({
            from_assignment_id: z.number().int(),
            to_assignment_id: z.number().int(),
            labels: z.array(ZRelationLabel),
          })
        ),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      let created = 0;
      await ctx.sql.begin(async (transaction) => {
        // postgres.js types a transaction without the call signature it has at
        // runtime; this restores it.
        const tx = transaction as unknown as Sql;
        for (const r of input.relations) {
          created += await insertDocumentRelationInTask(tx, input.task_id, r);
        }
      });
      return created;
    }),

  findById: disabledProcedure
    .input(
      z.number().int()
    )
    .query(async ({ctx, input}) => {
      let rows;
      try {
        rows = await relationById(ctx.sql, input);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findById: ${(error as Error).message}`});
      }
      if (rows.length !== 1)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findById: expected one row, got ${rows.length}`});
      return rows[0];
    }),

  findRelationsByTask: protectedProcedure
    .input(
      z.number().int()
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ctx, input: task_id}) => {
      try {
        // Each relation with the annotation it starts from and that
        // annotation's assignment.
        return (await relationsOfTask(ctx.sql, task_id)) as unknown as AnnotationRelation[];
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findRelationsByTask: ${(error as Error).message}`});
      }
    }),
    
  // previously 'findRelation':
  findFromAnnotationIds: protectedProcedure
    .input(
      z.array(z.number().int())
    )
    .use((opts) =>
      authorizer(opts, () => 
        Promise.resolve(opts.input.every(async id => 
          true === await annotationEditorOrAnnotatorAuthorizer(id, opts.ctx.user.id, opts.ctx))
        )
      )
    )
    .query(async ({ ctx, input }) => {
      try {
        return await relationsFromAnnotations(ctx.sql, input);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findFromAnnotationIds: ${(error as Error).message}`});
      }
    })

})

export type RelationRouter = typeof relationRouter