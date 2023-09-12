import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import { Project } from '~/types';

const ZProjectFields = z.object({
  name: z.string(),
  desc: z.string(),
  editor_id: z.string()
});

export const projectRouter = router({
  /* General Crud Definitions */
  'find': protectedProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]),
        filter: ZProjectFields
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase.from("projects").select();
      if (input.range)
        query = query.range(input.range[0], input.range[1])
      if (input.filter)
        query = query.match(input.filter)
      
      const { data, error } = await query;
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.find: ${error.message}`});
      else
        return data;
    }),

  'findById': protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: id }) => {
      const { data, error } = await ctx.supabase.from("projects").select().eq('id', id).single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.findById: ${error.message}`});
      else
        return data;
    }),

  'create': protectedProcedure
    .input(
      ZProjectFields
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("projects").insert(input).select().single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.create: ${error.message}`});
      else
        return data;
    }),

  'update': protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZProjectFields.partial()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("projects").update(input.updates).eq('id', input.id).select().single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.update: ${error.message}`});
      else
        return data;
    }),

  'delete': protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("projects").delete().eq('id', input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.delete: ${error.message}`});
    }),

  // Extra procedures

  'deleteAllFromUser': protectedProcedure
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("projects")
        .delete()
        .eq("user_id", ctx.user.id);
        
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.deleteAllFromUser: ${error.message}`});
      return true;
    }),

  // TODO: check changed implementation of count
  'getCountByUser': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ ctx, input: editor_id }) => {
      const { data, error, count } = await ctx.supabase
      .from("projects")
      .select("count", { count: 'exact' })
      .eq("editor_id", editor_id)
      .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.getCountByUser: ${error.message}`});
      else return count;
    })
  
})

export type ProjectRouter = typeof projectRouter