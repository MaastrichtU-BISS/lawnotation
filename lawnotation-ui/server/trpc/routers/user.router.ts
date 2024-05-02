import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { authorizer, protectedProcedure, publicProcedure, router } from '~/server/trpc'
import type { User } from '~/types';
import { zValidEmail } from '~/utils/validators';

export const userRouter = router({

  'clearInviteMetadata': protectedProcedure
    .mutation(async ({ ctx }) => {
      const user_metadata = ctx.user.user_metadata;
      
      if (user_metadata.assigned_task_id)
        user_metadata.assigned_task_id = null;

      const update = await ctx.supabase.auth.admin.updateUserById(ctx.user.id, {user_metadata});
    }),

  'findById': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ ctx, input: id }) => {
      const { data, error } = await ctx.supabase.from("users").select().eq('id', id).single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.findById: ${error.message}`});
      return data as User;
    }),

  'findByEmail': protectedProcedure
    .input(
      zValidEmail
    )
    .query(async ({ ctx, input: email }) => {
      const { data, error } = await ctx.supabase.from("users").select().eq('email', email).single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.findByEmail: ${error.message}`});
      return data as User;
    }),

  'findUsersByTask': protectedProcedure
    .input(
      z.number().int()
    )
    .query(async ({ctx, input: task_id}) => {
      const { data, error } = await ctx.supabase
        .from("users")
        .select("email, assignment:assignments!inner(task_id)")
        .eq("assignments.task_id", task_id);

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.findUsersByTask: ${error.message}`});
      return data;
    }),
  
  'getName': protectedProcedure
    .input(
      z.string()
    )
    .query(async ({ctx, input: user_id}) => {
      const { data, error } = await ctx.supabase
        .from("users")
        .select("email")
        .eq("id", user_id)
        .single();

      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.getName: ${error.message}`});
      return data.email
    }),

  // TODO: definitely test!
  // 'inviteUser': protectedProcedure
  //   .input(
  //     z.object({
  //       email: z.string().email(),
  //       redirectTo: z.string().url()
  //     })
  //   )
  //   .query(async ({ ctx, input }) => {
  //     const { data, error } = await ctx.supabase.auth.admin.generateLink({
  //       type: "magiclink",
  //       email: input.email,
  //       options: {
  //         redirectTo: input.redirectTo
  //       } 
  //     })
      
  //     if (error)
  //       throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.inviteUser: ${error.message}`});
  //     return data;
  //   }),
  
  'generateLink': protectedProcedure
    .input(
      zValidEmail
    )
    .use(opts => authorizer(opts, async () => false))
    .query(async ({ctx, input: email}) => {
      const config = useRuntimeConfig();
      const { data, error } = await ctx.supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: { redirectTo: `${config.public.baseURL}/auth/validate` },
      });
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: "Unable to generate link"});
      return data.properties;
    }),

  'otpLogin': publicProcedure
    .input(
      zValidEmail
    )
    .query(async ({ctx, input: email}) => {
      const login = await ctx.supabase.auth.signInWithOtp({ email: email })

      if (login.error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error sending token: ${login.error.message}`});
      
      return { message: "Login token has been sent! Please check your inbox" };
    }),
    
})

export type UserRouter = typeof userRouter