import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import type { Assignment } from '~/types';

const ZAssignmentFields = z.object({
  annotator_id: z.string(),
  task_id: z.number().int(),
  document_id: z.number().int(),
  status: z.union([z.literal("pending"), z.literal("done")]),
  seq_pos: z.number().int(),
  difficulty_rating: z.number().int()
});

export const assignmentRouter = router({

  'create': protectedProcedure
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
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in assignment.create: ${error.message}`});
      return data as Assignment;
    }),

  'createMany': protectedProcedure
    .input(
      z.array(
        // object is equal to ZAssignmentFields, but with optional's, since partial didn't work. check later
        z.object({
          annotator_id: z.string().optional(),
          task_id: z.number().int(),
          document_id: z.number().int(),
          status: z.union([z.literal("pending"), z.literal("done")]).optional(),
          seq_pos: z.number().int().optional(),
          difficulty_rating: z.number().int().optional()
        })
      )
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .insert(input)
        .select();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in createMany: ${error.message}`});
      return data as Assignment[];
    }),

  'findById': protectedProcedure
    .input(
      z.number().int()
    )
    .query(async ({ctx, input: assignment_id}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("id", assignment_id)
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in find: ${error.message}`});
      return data as Assignment;
    }),

  'update': protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZAssignmentFields.partial()
      })
    )
    .mutation(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .update(input.updates)
        .eq("id", input.id)
        .select()
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in update: ${error.message}`});
      return data as Assignment;
    }),

  'delete': protectedProcedure
    .input(
      z.number().int()
    )
    .mutation(async ({ctx, input: assignment_id}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .delete()
        .eq("id", assignment_id);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in delete: ${error.message}`});
      return true;
    }),

  'getCountByUser': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input: e_id}) => {
      const { data, error } = await ctx.supabase
        .rpc("get_count_assignments", { e_id: e_id })
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getCountByUser: ${error.message}`});
      return data;
    }),

  'getDifficultiesByEditor': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input: e_id}) => {
      const { data, error } = await ctx.supabase.rpc("get_difficulties_by_editor", {
        e_id: e_id,
      });

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getDifficultiesByEditor: ${error.message}`});
      return data;
    }),

  'getCompletionByEditor': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input: e_id}) => {
      const { data, error } = await ctx.supabase.rpc("get_completion_by_editor", {
        e_id: e_id,
      });

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getCompletionByEditor: ${error.message}`});
      return data;
    }),

  'getCompletionByAnnotator': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input: a_id}) => {
      const { data, error } = await ctx.supabase.rpc("get_completion_by_annotator", {
        a_id: a_id,
      });

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getCompletionByAnnotator: ${error.message}`});
      return data;
    }),

  'findAssignmentsByTask': protectedProcedure
    .input(
      z.number().int()
    )
    .query(async ({ctx, input: task_id}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("task_id", task_id)
        .order("id", { ascending: true });

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAssignmentsByTask: ${error.message}`});
      return data as Assignment[];
    }),

  'findAssignmentsByUserTaskSeq': protectedProcedure
    .input(
      z.object({
        annotator_id: z.string(),
        task_id: z.number().int(),
        seq_pos: z.number().int()
      })
    )
    .query(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("task_id", input.task_id)
        .eq("annotator_id", input.annotator_id)
        .eq("seq_pos", input.seq_pos)
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAssignmentsByUserTaskSeq: ${error.message}`});
      return data as Assignment;
    }),

  'findAssignmentsByUser': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input: user_id}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("annotator_id", user_id);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findAssignmentsByUser: ${error.message}`});
      return data as Assignment[];
    }),

  'findNextAssignmentsByUserAndTask': protectedProcedure
    .input(
      z.object({
        annotator_id: z.string(),
        task_id: z.number().int()
      })
    )
    .query(async ({ctx, input}) => {
      const { data, error } = await ctx.supabase
        .rpc("next_random_assignment", { a_id: input.annotator_id, t_id: input.task_id })
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findNextAssignmentsByUserAndTask: ${error.message}`});
      return data as Assignment;
    }),

  'findNextAssignmentByUser': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input: user_id}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("annotator_id", user_id)
        .eq("status", "pending")
        .order("task_id", { ascending: false })
        .order("seq_pos", { ascending: true })
        .limit(1)
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findNextAssignmentByUser: ${error.message}`});
      return data as Assignment;
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
      // const { data: total, error: error_total } = await ctx.supabase
      const { error: error_total, count } = await ctx.supabase
        .from("assignments")
        // .select("count")
        .select("*", { count: 'exact', head: true })
        .eq("annotator_id", input.annotator_id)
        .eq("task_id", input.task_id)
        // .single();

      if (error_next)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in 1 countAssignmentsByUserAndTask: ${error_next.message}`});
      else if (error_total)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in 2 countAssignmentsByUserAndTask: ${error_total.message}`});
      else
        // return {
        //   next: next?.seq_pos ?? total?.count! + 1, // TODO: need to check if this actually works
        //   total: total?.count ?? 0,
        // };
        return {
          next: next?.seq_pos ?? count! + 1, // TODO: need to check if this actually works
          total: count ?? 0,
        };
    }),

  'deleteAllFromTask': protectedProcedure
    .input(
      z.number().int()
    )
    .mutation(async ({ctx, input: task_id}) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .delete()
        .eq("task_id", task_id);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in deleteAllAssignmentsFromTask: ${error.message}`});
      return true;
    })
  
})

export type AssignmentRouter = typeof assignmentRouter 