import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import type { Sql } from 'postgres'
import { protectedProcedure, disabledProcedure, router, authorizer } from '~/server/trpc'
import type { AnnotationRelation } from '~/types';
import { annotationEditorOrAnnotatorAuthorizer } from '../authorizers/annotation.auth';
import { TRPCForbidden } from '../errors';
import { taskEditorAuthorizer } from '../authorizers';

const ZRelationDirection = z.enum(["bi", "left", "right"])
const ZRelationLabel = z.enum([
  "Is a",
  "Has a",
  "Belongs to",
  "Implies",
  "Depends on",
  "Related to",
  "Is not",
  "Part of",
]);

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

      const { data, error } = await ctx.supabase.from("annotation_relations").insert(input).select();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in create: ${error.message}`});
      return data as AnnotationRelation[];
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
          const inserted = await tx`
            INSERT INTO document_relations (from_assignment_id, to_assignment_id, labels)
            SELECT f.id, t.id, ${r.labels}::text[]::relation_labels[]
            FROM assignments AS f, assignments AS t
            WHERE f.id = ${r.from_assignment_id} AND t.id = ${r.to_assignment_id}
              AND f.id <> t.id
              AND f.task_id = ${input.task_id} AND t.task_id = ${input.task_id}
              AND f.annotator_number = t.annotator_number
            ON CONFLICT (from_assignment_id, to_assignment_id) DO NOTHING
          `;
          created += inserted.count;
        }
      });
      return created;
    }),

  findById: disabledProcedure
    .input(
      z.number().int()
    )
    .query(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase.from("annotation_relations").select().eq("id", input).single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findById: ${error.message}`});
      return data as AnnotationRelation;
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
      const { data, error } = await ctx.supabase
        .from("annotation_relations")
        .select(
          "*, annotation:from_id!inner(id, assignment:assignments!inner(id, task_id, document_id))"
        )
        .eq("from_id.assignments.task_id", task_id);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findRelationsByTask: ${error.message}`});
      return data as AnnotationRelation[];
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
      const { data, error } = await ctx.supabase.from("annotation_relations").select().in("from_id", input);
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findFromAnnotationIds: ${error.message}`});
      
      return data as AnnotationRelation[];
    })

})

export type RelationRouter = typeof relationRouter