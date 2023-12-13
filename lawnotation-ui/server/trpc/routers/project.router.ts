import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { authorizer, protectedProcedure, router } from '~/server/trpc'
import type { Project } from '~/types';
import type { Context } from '../context';

const ZProjectFields = z.object({
  name: z.string().min(3),
  desc: z.string(),
  editor_id: z.string()
});

const projectAuthorizer = async (project_id: number, user_id: string, ctx: Context) => {
  const {count} = await ctx.supabase
    .from("projects")
    .select('*', {count: 'exact', head: true})
    .eq('id', project_id)
    .eq('editor_id', user_id);

  // return count === 1
  return true;
}

export const projectRouter = router({
  /* General Crud Definitions */
  /*
  'find': protectedProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZProjectFields.partial().optional()
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
      return data as Project[];
    }),
  */

  'findById': protectedProcedure
    .input(z.number().int())
    .use(
      opts =>
        authorizer(opts, () =>
          projectAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
    .query(async ({ ctx, input: id }) => {
      const { data, error, count } = await ctx.supabase.from("projects").select().eq('id', id).single();
      
      if (count === 0)
        throw new TRPCError({code: 'NOT_FOUND'});
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.findById: ${error.message}`});
      return data as Project;
    }),

  'create': protectedProcedure
    .input(
      ZProjectFields
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("projects").insert(input).select().single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.create: ${error.message}`});
      return data as Project;
    }),

  'update': protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZProjectFields.partial()
      })
    )
    .use(
      opts =>
        authorizer(opts, () =>
          projectAuthorizer(opts.input.id, opts.ctx.user.id, opts.ctx))
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("projects").update(input.updates).eq('id', input.id).select().single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.update: ${error.message}`});
      return data as Project;
    }),

  'delete': protectedProcedure
    .input(
      z.number().int()
    )
    .use(
      opts =>
        authorizer(opts, () =>
          projectAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("projects").delete().eq('id', input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.delete: ${error.message}`});
      return true;
    }),

  // Extra procedures

  'deleteAllFromEditor': protectedProcedure
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("projects")
        .delete()
        .eq("editor_id", ctx.user.id); //editor id
        
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.deleteAllFromEditor: ${error.message}`});
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
      return count;
    })
  
})

export type ProjectRouter = typeof projectRouter