import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import type { AnnotationRelation } from '~/types';
import { convert_relation_ls2db } from '~/utils/serialize';

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

const ZRelationCreateSerialized = z.object({
  from_id: z.string(),
  to_id: z.string(),
  direction: ZRelationDirection,
  labels: z.array(ZRelationLabel),
  type: z.string()
})

const ZRelationFields = z.object({
  // id: z.number,
  from_id: z.number().int(),
  to_id: z.number().int(),
  ls_to: z.string(),
  ls_from: z.string(),
  direction: ZRelationDirection,
  labels: z.array(ZRelationLabel)
});

export const relationRouter = router({
  'create': protectedProcedure
    .input(
      z.object({
        fields: ZRelationCreateSerialized,
        from_id: z.number(),
        to_id: z.number()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const converted_input = convert_relation_ls2db(input.fields, input.from_id, input.to_id)
      const { data, error } = await ctx.supabase.from("annotation_relations").insert(converted_input).select().single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in create: ${error.message}`});
      return data as AnnotationRelation;
    }),

  'createMany': protectedProcedure
    .input(
      z.array(ZRelationFields)
    )
    .mutation(async ({ ctx, input }) => {
      // const converted_input = convert_relation_ls2db(input.fields, input.from_id, input.to_id)
      const { data, error } = await ctx.supabase.from("annotation_relations").insert(input).select();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in create: ${error.message}`});
      return data as AnnotationRelation[];
    }),

  'findById': protectedProcedure
    .input(
      z.number().int()
    )
    .query(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase.from("annotation_relations").select().eq("id", input).single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findById: ${error.message}`});
      return data as AnnotationRelation;
    }),

  'findRelationsByTask': protectedProcedure
    .input(
      z.number().int()
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
  'findFromAnnotationIds': protectedProcedure
    .input(
      z.array(z.number().int())
    )
    .query(async ({ ctx, input }) => {
      const relations: AnnotationRelation[] = [];
      for (const id of input) {
          const { data, error } = await ctx.supabase.from("annotation_relations").select().eq("from_id", id);
          relations.push(...data as AnnotationRelation[]);

          if (error)
            throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findFromAnnotationIds: ${error.message}`});
      }

      return relations as AnnotationRelation[];
    })

})

export type RelationRouter = typeof relationRouter