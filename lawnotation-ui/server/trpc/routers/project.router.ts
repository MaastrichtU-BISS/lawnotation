import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { authorizer, protectedProcedure, disabledProcedure, router } from '~/server/trpc'
import * as P from '~/server/db/queries/projects';
import { projectEditorAuthorizer } from '../authorizers';

const ZProjectFields = z.object({
  name: z.string().min(3),
  desc: z.string(),
  // editor_id: z.string()
});

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const projectRouter = router({
  /* General Crud Definitions */
  find: disabledProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZProjectFields.partial().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await P.findProjects(ctx.sql, input.filter, input.range);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.find: ${message(error)}`});
      }
    }),

  findById: protectedProcedure
    .input(z.number().int())
    .use(
      opts =>
        authorizer(opts, () =>
          projectEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
    .query(async ({ ctx, input: id }) => {
      try {
        return await P.projectById(ctx.sql, id);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.findById: ${message(error)}`});
      }
    }),

  create: protectedProcedure
    .input(
      ZProjectFields
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await P.insertProject(ctx.sql, ctx.user.id, input);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.create: ${message(error)}`});
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZProjectFields.partial()
      })
    )
    .use(
      opts =>
        authorizer(opts, () =>
          projectEditorAuthorizer(opts.input.id, opts.ctx.user.id, opts.ctx))
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await P.updateProject(ctx.sql, input.id, input.updates);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.update: ${message(error)}`});
      }
    }),

  delete: protectedProcedure
    .input(
      z.number().int()
    )
    .use(
      opts =>
        authorizer(opts, () =>
          projectEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await P.deleteProject(ctx.sql, input);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.delete: ${message(error)}`});
      }
      return true;
    }),

  // Extra procedures

  deleteAllFromEditor: protectedProcedure
    .mutation(async ({ ctx, input }) => {
      try {
        await P.deleteProjectsOfEditor(ctx.sql, ctx.user.id);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.deleteAllFromEditor: ${message(error)}`});
      }
      return true;
    }),

  getCountByUser: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await P.countProjectsOfEditor(ctx.sql, ctx.user.id);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.getCountByUser: ${message(error)}`});
      }
    })
  
})

export type ProjectRouter = typeof projectRouter
