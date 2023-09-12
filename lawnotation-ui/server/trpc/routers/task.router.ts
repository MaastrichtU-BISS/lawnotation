import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import { Task } from '~/types';

const ZTaskFields = z.object({
  name: z.string(),
  desc: z.string(),
  source: z.string(),
  project_id: z.number().int(),
  labelset_id: z.number().int(),
  ann_guidelines: z.string()
});

export const taskRouter = router({
  /* General Crud Definitions */
  'find': protectedProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]),
        filter: ZTaskFields
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase.from("tasks").select();
      if (input.range)
        query = query.range(input.range[0], input.range[1])
      if (input.filter)
        query = query.match(input.filter)
      
      const { data, error } = await query;
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in tasks.find: ${error.message}`});
      else
        return data;
    }),

  'findById': protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: id }) => {
      const { data, error } = await ctx.supabase.from("tasks").select().eq('id', id).single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in tasks.findById: ${error.message}`});
      else
        return data;
    }),

  'create': protectedProcedure
    .input(
      ZTaskFields
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("tasks").insert(input).select().single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in tasks.create: ${error.message}`});
      else
        return data;
    }),

  'update': protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZTaskFields.partial()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("tasks").update(input.updates).eq('id', input.id).select().single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in tasks.update: ${error.message}`});
      else
        return data;      
    }),

  'delete': protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("tasks").delete().eq('id', input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in tasks.delete: ${error.message}`});
    }),

  // Extra procedures

  'getCountByUser': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ ctx, input: editor_id }) => {
      const { data, error } = await ctx.supabase
        .rpc("get_count_tasks", { e_id: editor_id })
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in tasks.getCountByUser: ${error.message}`});
      return data;
    }),

  'getAllAnnotatorTasks': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input: annotator_id}) => {
      const { data, error } = await ctx.supabase.rpc("get_all_annotator_tasks", {
        a_id: annotator_id,
      });
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in tasks.getAllAnnotatorTasks: ${error.message}`});
      return data;
    }),

  'deleteAllFromTask': protectedProcedure
    .input(
      z.number().int()
    )
    .mutation(async ({ctx, input: project_id}) => {
      const { data, error } = await ctx.supabase
        .from("tasks")
        .delete()
        .eq("project_id", project_id);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in tasks.delete: ${error.message}`});
    })
})

export type LabelsetRouter = typeof taskRouter