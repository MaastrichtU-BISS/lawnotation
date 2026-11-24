import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { authorizer, protectedProcedure, disabledProcedure, router } from '~/server/trpc'
import type { Project } from '~/types';
import type { Context } from '../context';
import { projectEditorAuthorizer } from '../authorizers';

const ZProjectFields = z.object({
  name: z.string().min(3),
  desc: z.string(),
  // editor_id: z.string()
});

// The one row a query must return, as PostgREST's .single() demanded.
function one<T>(rows: readonly T[]): T {
  if (rows.length !== 1) throw new Error(`expected one row, found ${rows.length}`);
  return rows[0]!;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** `AND column = value` for each given field, as PostgREST's match() did. */
function matching(sql: Context["sql"], fields: Record<string, unknown>) {
  const matches = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([column, value]) => sql`AND ${sql(column)} = ${value as string}`);
  return matches.length ? matches : sql``;
}

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
      const range = input.range
        ? ctx.sql`LIMIT ${Math.max(input.range[1] - input.range[0] + 1, 0)} OFFSET ${input.range[0]}`
        : ctx.sql``;
      try {
        return await ctx.sql<Project[]>`
          SELECT * FROM projects WHERE true ${matching(ctx.sql, input.filter ?? {})} ${range}
        `;
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
        return one(await ctx.sql<Project[]>`SELECT * FROM projects WHERE id = ${id}`);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.findById: ${message(error)}`});
      }
    }),

  create: protectedProcedure
    .input(
      ZProjectFields
    )
    .mutation(async ({ ctx, input }) => {
      const row: Record<string, unknown> = { ...input, editor_id: ctx.user.id };
      try {
        return one(
          await ctx.sql<Project[]>`INSERT INTO projects ${ctx.sql(row, ...Object.keys(row))} RETURNING *`
        );
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
      const updates: Record<string, unknown> = input.updates;
      const columns = Object.keys(updates).filter((column) => updates[column] !== undefined);
      try {
        return one(
          columns.length
            ? await ctx.sql<Project[]>`
                UPDATE projects SET ${ctx.sql(updates, ...columns)} WHERE id = ${input.id} RETURNING *
              `
            : await ctx.sql<Project[]>`SELECT * FROM projects WHERE id = ${input.id}`
        );
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
        await ctx.sql`DELETE FROM projects WHERE id = ${input}`;
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.delete: ${message(error)}`});
      }
      return true;
    }),

  // Extra procedures

  deleteAllFromEditor: protectedProcedure
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.sql`DELETE FROM projects WHERE editor_id = ${ctx.user.id}`;
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.deleteAllFromEditor: ${message(error)}`});
      }
      return true;
    }),

  getCountByUser: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const [{ count }] = await ctx.sql<[{ count: number }]>`
          SELECT count(*)::int AS count FROM projects WHERE editor_id = ${ctx.user.id}
        `;
        return count;
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in projects.getCountByUser: ${message(error)}`});
      }
    })
  
})

export type ProjectRouter = typeof projectRouter
