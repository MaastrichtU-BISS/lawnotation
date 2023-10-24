import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import type { Labelset } from '~/types';

const ZLabelsetFields = z.object({
  name: z.string(),
  desc: z.string(),
  editor_id: z.string(),
  labels: z.array(
    z.object({
      name: z.string(),
      color: z.string()
    })
  )
});

export const labelsetRouter = router({
  /* General Crud Definitions */
  'find': protectedProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZLabelsetFields.partial().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase.from("labelsets").select();
      if (input.range)
        query = query.range(input.range[0], input.range[1])
      if (input.filter)
        query = query.match(input.filter)
      
      const { data, error } = await query;
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in labelsets.find: ${error.message}`});
      return data as Labelset[];
    }),

  'findById': protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: id }) => {
      const { data, error } = await ctx.supabase.from("labelsets").select().eq('id', id).single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in labelsets.findById: ${error.message}`});
      return data as Labelset;
    }),

  'create': protectedProcedure
    .input(
      ZLabelsetFields
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("labelsets").insert(input).select().single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in labelsets.create: ${error.message}`});
      return data as Labelset;
    }),

  'update': protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZLabelsetFields.partial()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("labelsets").update(input.updates).eq('id', input.id).select().single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in labelsets.update: ${error.message}`});
      return data as Labelset;
    }),

  'delete': protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("labelsets").delete().eq('id', input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in labelsets.delete: ${error.message}`});
      return true;
    })
    
})

export type LabelsetRouter = typeof labelsetRouter