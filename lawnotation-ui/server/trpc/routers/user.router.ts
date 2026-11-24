import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { authorizer, protectedProcedure, disabledProcedure, router } from '~/server/trpc'
import type { User } from '~/types';
import { zValidEmail } from '~/utils/validators';
import { taskEditorAuthorizer } from '../authorizers';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

// Sign-in, invitations and sign-in links are handled by Keycloak (see
// server/utils/auth.ts); this router only reads and updates the users table.
export const userRouter = router({

  clearInviteMetadata: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        await ctx.sql`
          update users
          set metadata = metadata || '{"assigned_task_id": null}'::jsonb
          where id = ${ctx.user.id}`;
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.clearInviteMetadata: ${errorMessage(error)}`});
      }
    }),

  setGuidance: protectedProcedure
    .input(
      z.boolean()
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.sql`
          update users
          set metadata = metadata || jsonb_build_object('guidanceStatus', ${input}::boolean)
          where id = ${ctx.user.id}`;
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.setGuidance: ${errorMessage(error)}`});
      }
    }),

  findById: disabledProcedure
    .input(
      z.string()
    )
    .query(async ({ ctx, input: id }) => {
      let rows: User[];
      try {
        rows = await ctx.sql<User[]>`select id, email, role from users where id = ${id}`;
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.findById: ${errorMessage(error)}`});
      }
      if (rows.length !== 1)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.findById: user not found`});
      return rows[0];
    }),

  findByEmail: disabledProcedure
    .input(
      zValidEmail
    )
    .query(async ({ ctx, input: email }) => {
      let rows: User[];
      try {
        rows = await ctx.sql<User[]>`select id, email, role from users where email = ${email}`;
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.findByEmail: ${errorMessage(error)}`});
      }
      if (rows.length !== 1)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.findByEmail: user not found`});
      return rows[0];
    }),

  findUsersByTask: protectedProcedure
    .input(
      z.number().int()
    )
    .use((opts) => 
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx))
    )
    .query(async ({ctx, input: task_id}) => {
      // One row per annotator of the task, with their assignments in it.
      try {
        return await ctx.sql<{ email: string | null; assignment: { task_id: number }[] }[]>`
          select u.email, json_agg(json_build_object('task_id', a.task_id)) as assignment
          from users u
          join assignments a on a.annotator_id = u.id
          where a.task_id = ${task_id}
          group by u.id, u.email`;
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.findUsersByTask: ${errorMessage(error)}`});
      }
    }),
  
  getName: disabledProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input: user_id}) => {
      let rows: { email: string | null }[];
      try {
        rows = await ctx.sql<{ email: string | null }[]>`select email from users where id = ${user_id}`;
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.getName: ${errorMessage(error)}`});
      }
      if (rows.length !== 1)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.getName: user not found`});
      return rows[0]!.email
    }),
    
})

export type UserRouter = typeof userRouter
