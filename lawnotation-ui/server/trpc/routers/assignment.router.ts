import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import { Assignment } from '~/types';

const ZAssignmentFields = z.object({
  annotator_id: z.string(),
  task_id: z.number().int(),
  document_id: z.number().int(),
  status: z.union([z.literal("pending"), z.literal("done")]),
  seq_pos: z.number().int(),
  difficulty_rating: z.number().int()
});

export const assignmentRouter = router({

  'AAAfindAssignmentsByTaskId': protectedProcedure
    .input(
      z.number().int()
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("assignments").select().eq("task_id", input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAssignmentsByTaskId: ${error.message}`});
      else
        return data;
    }),

  'AAAfindAssignmentsByUserTaskSeq': protectedProcedure
    .input(
      z.object({
        annotator_id: z.number().int(),
        task_id: z.number().int(),
        seq_pos: z.number().int()
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("assignments")
        .select()
        .eq("task_id", input.task_id)
        .eq("annotator_id", input.annotator_id)
        .eq("seq_pos", input.seq_pos)
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in AfindAssignmentsByUserTaskSeq: ${error.message}`});
      else
        return data;
    }),



  'createAssignment': protectedProcedure
    .input(
      ZAssignmentFields
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .insert(input)
        .select()
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in createAssignment: ${error.message}`});
      else
        return data;
    }),

  'createAssignments': protectedProcedure
    .input(
      z.array(ZAssignmentFields)
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .insert(input)
        .select()
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in createAssignments: ${error.message}`});
      else
        return data;
    }),

  'findAssignment': protectedProcedure
    .input(
      z.number().int()
    )
    .query(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("id", input)
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAssignment: ${error.message}`});
      else
        return data;
    }),

  'getCountByUser': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .rpc("get_count_assignments", { e_id: input })
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getCountByUser: ${error.message}`});
      else
        return data;
    }),

  'getDifficultiesByEditor': protectedProcedure
    .input(
      z.string()
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase.rpc("get_difficulties_by_editor", {
        e_id: input,
      });

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getDifficultiesByEditor: ${error.message}`});
      else
        return data;
    }),

  'getCompletionByEditor': protectedProcedure
    .input(
      z.string()
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase.rpc("get_completion_by_editor", {
        e_id: input,
      });

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getCompletionByEditor: ${error.message}`});
      else
        return data;
    }),

  'getCompletionByAnnotator': protectedProcedure
    .input(
      z.string()
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase.rpc("get_completion_by_annotator", {
        a_id: input,
      });

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getCompletionByAnnotator: ${error.message}`});
      else
        return data;
    }),

  'findAssignmentsByTask': protectedProcedure
    .input(
      z.number().int()
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("task_id", input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAssignmentsByTask: ${error.message}`});
      else
        return data;
    }),

  'findAssignmentsByUserTaskSeq': protectedProcedure
    .input(
      z.object({
        annotator_id: z.string(),
        task_id: z.string(),
        seq_pos: z.number().int()
      })
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("task_id", input.task_id)
        .eq("annotator_id", input.annotator_id)
        .eq("seq_pos", input.seq_pos)
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAssignmentsByUserTaskSeq: ${error.message}`});
      else
        return data;
    }),

  'findAssignmentsByUser': protectedProcedure
    .input(
      z.string()
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("annotator_id", input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAssignmentsByUser: ${error.message}`});
      else
        return data;
    }),

  'findNextAssignmentsByUserAndTask': protectedProcedure
    .input(
      z.object({
        annotator_id: z.string(),
        task_id: z.number().int()
      })
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .rpc("next_random_assignment", { a_id: input.annotator_id, t_id: input.task_id })
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findNextAssignmentsByUserAndTask: ${error.message}`});
      else
        return data;
    }),

  'findNextAssignmentByUser': protectedProcedure
    .input(
      z.string()
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("annotator_id", input)
        .eq("status", "pending")
        .order("task_id", { ascending: false })
        .order("seq_pos", { ascending: true })
        .limit(1)
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findNextAssignmentByUser: ${error.message}`});
      else
        return data;
    }),

  'countAssignmentsByUserAndTask': protectedProcedure
    .input(
      z.object({
        annotator_id: z.string(),
        task_id: z.number().int()
      })
    )
    .query(async ({ctx, input}) => {
      const { data: next, error: error_next } = await ctx.supabase
        .from("assignments")
        .select("seq_pos")
        .eq("annotator_id", input.annotator_id)
        .eq("task_id", input.task_id)
        .eq("status", "pending")
        .order("seq_pos", { ascending: true })
        .limit(1)
        .single();
      const { data: total, error: error_total } = await ctx.supabase
        .from("assignments")
        .select("count")
        .eq("annotator_id", input.annotator_id)
        .eq("task_id", input.task_id)
        .single();

      if (error_next)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in 1 countAssignmentsByUserAndTask: ${error_next.message}`});
      else if (error_total)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in 2 countAssignmentsByUserAndTask: ${error_total.message}`});
      else
        return {
          next: next?.seq_pos ?? total?.count! + 1, // TODO: need to check if this actually works
          total: total?.count ?? 0,
        };
    }),

  'updateAssignment': protectedProcedure
    .input(
      z.object({
        id: z.string(),
        fields: ZAssignmentFields
      })
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .update(input.fields)
        .eq("id", input.id)
        .select()
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in updateAssignment: ${error.message}`});
      else
        return data;
    }),

  'deleteAssignment': protectedProcedure
    .input(
      z.number().int()
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .delete()
        .eq("id", input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in deleteAssignment: ${error.message}`});
      else
        return data;
    }),


  'deleteAllAssignmentsFromTask': protectedProcedure
    .input(
      z.number().int()
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .delete()
        .eq("task_id", input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in deleteAllAssignmentsFromTask: ${error.message}`});
      else
        return data;
    }),


  // 'name': protectedProcedure
  //   .input(
  //     z.object({

  //     })
  //   )
  //   .mutation(async ({ctx, input}) => {

  //     if (error)
  //       throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in : ${error.message}`});
  //     else
  //       return data;
  //   }),

  

})

export type AssignmentRouter = typeof assignmentRouter 