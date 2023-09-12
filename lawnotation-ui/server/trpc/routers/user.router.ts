import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '~/server/trpc'
import { User } from '~/types';

// const ZUserFields = z.object({
//   email: z.string().email(),
//   role: z.union([z.literal("editor"), z.literal("annotator")])
// });

export const userRouter = router({

  'findById': protectedProcedure
    .input(
      z.number().int()
    )
    .query(async ({ ctx, input: id }) => {
      const { data, error } = await ctx.supabase.from("users").select().eq('id', id).single();
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.findById: ${error.message}`});
      return data as User;
    }),

  'findByEmail': protectedProcedure
    .input(
      z.string().email()
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
  'inviteUser': protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        redirectTo: z.string().url()
      })
    )
    .query(async ({ ctx, input }) => {
      const serviceClient = ctx.getSupabaseServiceRoleClient()
      const { data, error } = await serviceClient.auth.admin.generateLink({
        type: "magiclink",
        email: input.email,
        options: {
          redirectTo: input.redirectTo
        } 
      })
      
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error in users.inviteUser: ${error.message}`});
      return data;
    }),

  'otpLogin': publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        redirectTo: z.string().url()
      })
    )
    .query(async ({ctx, input}) => {
      // const client = serverSupabaseClient(event)
      // const body = await readBody(event)
      const login = await ctx.supabase.auth.signInWithOtp({email: input.email, options: { emailRedirectTo: input.redirectTo } })

      if (login.error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error logging in: ${login.error.message}`});
      
      const user = await ctx.supabase.from("users").select().eq("email", input.email).single();
      return { user: user.data }
    })
    
})

export type UserRouter = typeof userRouter