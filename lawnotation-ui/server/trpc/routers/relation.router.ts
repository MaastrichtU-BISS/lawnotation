import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import { AnnotationRelation } from '~/types';
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
        throw Error(`Error in createRelation: ${error.message}`)
      else
        return data as AnnotationRelation;
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
      }
      return relations;
    })

})

export type RelationRouter = typeof relationRouter