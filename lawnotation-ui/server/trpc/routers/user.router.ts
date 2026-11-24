import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { authorizer, protectedProcedure, disabledProcedure, router } from '~/server/trpc'
import type { User } from '~/types';
import * as U from '~/server/db/queries/users';
import { zValidEmail } from '~/utils/validators';
import { taskEditorAuthorizer } from '../authorizers';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

// Sign-in, invitations and sign-in links are handled by Keycloak (see
// server/utils/auth.ts); this router only reads and updates the users table.
export const userRouter = router({

  clearInviteMetadata: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        await U.clearInviteMetadata(ctx.sql, ctx.user.id);
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
        await U.setGuidanceStatus(ctx.sql, ctx.user.id, input);
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
        rows = await U.usersWithId(ctx.sql, id);
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
        rows = await U.usersWithEmail(ctx.sql, email);
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
        return await U.annotatorsWithAssignmentsOfTask(ctx.sql, task_id);
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
        rows = await U.emailsOfUserId(ctx.sql, user_id);
      } catch (error) {
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.getName: ${errorMessage(error)}`});
      }
      if (rows.length !== 1)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.getName: user not found`});
      return rows[0]!.email
    }),
    
})

export type UserRouter = typeof userRouter
