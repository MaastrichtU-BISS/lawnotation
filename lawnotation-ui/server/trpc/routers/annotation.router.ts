import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import type { Annotation } from '~/types';

const ZAnnotationFields = z.object({
  label: z.string(),
  assignment_id: z.number().int(),
  start_index: z.number().int(),
  end_index: z.number().int(),
  text: z.string(),
  origin: z.union([z.literal("manual"), z.literal("imported"), z.literal("model")]),
  ls_id: z.string(),
});

export const annotationRouter = router({
  /* General Crud Definitions */
  'find': protectedProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZAnnotationFields.partial().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase.from("annotations").select();
      if (input.range)
        query = query.range(input.range[0], input.range[1])
      if (input.filter)
        query = query.match(input.filter)
      
      const { data, error } = await query;
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in annotation.find: ${error.message}`});
      return data as Annotation[];
    }),

  'findById': protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("annotations").select().eq('id', input).single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in annotation.findById: ${error.message}`});
      return data as Annotation;
    }),

  'findByAssignment': protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: assignment_id }) => {
      const { data, error } = await ctx.supabase.from("annotations").select().eq('assignment_id', assignment_id);
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in annotation.findByAssignment: ${error.message}`});
      return data as Annotation[];
    }),

  'create': protectedProcedure
    .input(
      ZAnnotationFields
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("annotations").insert(input).select().single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in annotation.create: ${error.message}`});
      return data as Annotation;
    }),

  'createMany': protectedProcedure
    .input(
      z.array(ZAnnotationFields)
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("annotations").insert(input).select();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in annotation.create: ${error.message}`});
      return data as Annotation[];
    }),

  'update': protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZAnnotationFields.partial()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("annotations").update(input.updates).eq('id', input.id).select().single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in annotation.update: ${error.message}`});
      return data as Annotation;
    }),

  'delete': protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("annotations").delete().eq('id', input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in annotation.delete: ${error.message}`});
      return true;
    }),


  /* Specific Implementations */

  'findAnnotationsByTaskLabelDocumentsAnnotators': protectedProcedure
    .input(
      z.object({
        task_id: z.string(),
        label: z.string(),
        documents: z.array(z.string()),
        annotators: z.array(z.string())
      })
    )
    .query(async ({ctx, input}) => {
      let query = ctx.supabase
        .from("annotations")
        .select(
          "id, start_index, end_index, label, text, assignment:assignments!inner(task_id, document_id, document:documents(id, name), annotator:users!inner(email))"
        )
        .eq("assignments.task_id", input.task_id)
        .eq("label", input.label);

      if (input.documents.length > 0)
        query = query.in("assignments.document_id", input.documents);

      if (input.annotators.length > 0)
        query = query.in("assignments.users.email", input.annotators);

      const { data, error } = await query;
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAnnotationsByTaskAndDocumentAndLabel: ${error.message}`});
      else {
        return data.map((ann) => {
          return {
            start: ann.start_index,
            end: ann.end_index,
            text: ann.text ? ann.text.replaceAll("\\n", "") : ann.text,
            label: ann.label,
            annotator: ann.assignment?.annotator?.email,
            hidden: false,
            ann_id: ann.id,
            doc_id: ann.assignment?.document_id,
            doc_name: ann.assignment?.document?.name,
          };
        });
      }
    }),

  'findAnnotationsByTaskAndDocumentAndLabelsAndAnnotators': protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        document_id: z.number().int(),
        label: z.string(),
        annotators: z.array(z.string())
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('annotations')
        .select(
          "start_index, end_index, label, text, assignment:assignments!inner(task_id, document_id, annotator:users!inner(email))"
        )
        .eq("assignments.task_id", input.task_id)
        .eq("assignments.document_id", input.document_id)
        .eq("label", input.label)
        .in("assignments.users.email", input.annotators);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAnnotationsByTaskAndDocumentAndLabel: ${error.message}`});
      return data;
    }),

  'findAnnotationsByTask': protectedProcedure
    .input(
      z.number().int()
    )
    .query(async ({ ctx, input: task_id }) => {
      const { data, error } = await ctx.supabase
        .from("annotations")
        .select("*, assignment:assignments!inner(id, task_id, document_id, annotator_id)")
        .eq("assignment.task_id", task_id)
        .order("id");

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAnnotationsByTaskAndDocumentAndLabel: ${error.message}`});
      return data as Annotation[];
    }),
  
  'updateAssignmentAnnotations': protectedProcedure
    .input(
      z.object({
        assignment_id: z.number().int(),
        annotations: z.array(ZAnnotationFields)
      })
    ) 
    .mutation(async ({ ctx, input }) => {
      const query_delete = await ctx.supabase
        .from("annotations")
        .delete()
        .eq("assignment_id", input.assignment_id);

      if (query_delete.error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Unable to delete old annotations on update: ${query_delete.error.message}`});

      const query_insert = await ctx.supabase
        .from("annotations")
        .insert(input.annotations)
        .select();

      if (query_insert.error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Unable to insert old annotations on update: ${query_insert.error.message}`});

      // annotations.push(...query_insert.data as Annotation[]); // Reason for this is unclear to me? Seems to edit arg by reference, while also returning. This would make no sense in backend so commented to prevent lost computation
      // console.log("updated annotations: ", query_insert.data);

      return query_insert.data as Annotation[];
    }),

})

export type AnnotationRouter = typeof annotationRouter 