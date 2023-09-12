import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import { Document } from '~/types';

const ZDocumentFields = z.object({
  name: z.string(),
  project_id: z.number().int(),
  source: z.string(),
  full_text: z.string(),
});

export const documentRouter = router({
  /* General Crud Definitions */
  'find': protectedProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZDocumentFields.partial().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase.from("documents").select();
      if (input.range)
        query = query.range(input.range[0], input.range[1])
      if (input.filter)
        query = query.match(input.filter)
      
      const { data, error } = await query;
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in documents.find: ${error.message}`});
      return data as Document[];
    }),

  'findById': protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: id }) => {
      const { data, error } = await ctx.supabase.from("documents").select().eq('id', id).single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in documents.findById: ${error.message}`});
      return data as Document;
    }),

  'create': protectedProcedure
    .input(
      ZDocumentFields
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("documents").insert(input).select().single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in documents.create: ${error.message}`});
      return data as Document;
    }),

  'createMany': protectedProcedure
    .input(
      z.array(ZDocumentFields)
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("documents").insert(input).select();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in documents.create: ${error.message}`});
      return data as Document[];
    }),

  'update': protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZDocumentFields.partial()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("documents").update(input.updates).eq('id', input.id).select().single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in documents.update: ${error.message}`});
      return data as Document;
    }),

  'delete': protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("documents").delete().eq('id', input);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in documents.delete: ${error.message}`});
      return true;
    }),

  'table': protectedProcedure
    .input(
      z.object({
        project_id: z.number().int(),
        offset: z.number().int(),
        limit: z.number().int()
      })
    )
    .query(async ({ctx, input}) => {

      const { data, error, count } = await ctx.supabase
      .from("documents")
      .select("*", { count: "exact" })
      .eq("project_id", input.project_id)
      .range(input.offset, input.offset + input.limit - 1);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in documents.table: ${error.message}`});
      return { rows: data, count };
    }),

  // Extra implementations

  'findByProject': protectedProcedure
    .input(
      z.number().int()
    )
    .query(async ({ ctx, input: project_id }) => {
      const { data, error } = await ctx.supabase.from("documents").select().eq('project_id', project_id);
      ctx.supabase.auth.admin.generateLink
    
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in documents.findByProject: ${error.message}`});
      return data as Document[];
    }),

    'findSharedDocumentsByTask': protectedProcedure
      .input(
        z.number().int()
      )
      .query(async ({ctx, input: task_id}) => {
        const { data, error } = await ctx.supabase.rpc(
          "get_all_shared_docs_from_task",
          { t_id: task_id }
        );
        
        if (error)
          throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in findSharedDocumentsByTask: ${error.message}`});
        return data as Document[];
      }),

    'takeUpToNRandomDocuments': protectedProcedure
      .input(
        z.object({
          project_id: z.number().int(),
          n: z.number().int()
        })
      )
      .query(async ({ctx, input}) => {
        const { data, error } = await ctx.supabase.rpc("random_sample", {
          n: input.n,
          pid: input.project_id,
        });
    
        if (error)
          throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in takeUpToNRandomDocuments: ${error.message}`});
        return data as number[];
      }),

    'totalAmountOfDocs': protectedProcedure
      .input(
        z.number().int()
      )
      .query(async ({ctx, input: project_id}) => {
        const { data, error, count } = await ctx.supabase
          .from("documents")
          .select("*", { count: 'exact' })
          .eq("project_id", project_id)
          .single();
        
        if (error)
          throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in totalAmountOfDocs: ${error.message}`});
        return count // TODO: check if valid. original is data.count
      }),

    // TODO: replace with just get whole doc and get name property from there?
    'getName': protectedProcedure
      .input(
        z.number().int()
      )
      .query(async ({ctx, input: id}) => {
        const { data, error } = await ctx.supabase
          .from("documents")
          .select("name")
          .eq("id", id)
          .single();

        if (error)
          throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getName: ${error.message}`});
        return data.name
      }),

    // 'updateDocument' -> update
    // 'deleteDocument' -> 'delete'

    'deleteAllFromProject': protectedProcedure
      .input(
        z.number().int()
      )
      .mutation(async ({ctx, input: project_id}) => {
        const { data, error } = await ctx.supabase
          .from("documents")
          .delete()
          .eq("project_id", project_id);

        if (error)
          throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in getName: ${error.message}`});
        return true;
      })

})

export type DocumentRouter = typeof documentRouter 