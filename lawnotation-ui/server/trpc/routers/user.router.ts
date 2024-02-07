import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { authorizer, protectedProcedure, publicProcedure, router } from '~/server/trpc'
import type { User } from '~/types';
import { MailtrapClient } from "mailtrap"

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
  'generateLink': protectedProcedure
    .input(
      z.string().email()
    )
    .use(opts => authorizer(opts, async () => false))
    .query(async ({ctx, input: email}) => {
      const config = useRuntimeConfig();
      const client = ctx.getSupabaseServiceRoleClient();
      const { data, error } = await client.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: { redirectTo: `${config.public.baseURL}/auth/validate` },
      });
      if (error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: "Unable to generate link"});
      return data.properties;
    }),

  'otpLoginIntermediate': publicProcedure
    .input(
      z.string().email()
    )
    .use(opts => authorizer(opts, async () => false))
    .query(async ({ctx, input: email}) => {
      
      const config = useRuntimeConfig();
      const baseURL = config.public.baseURL;
      const client = ctx.getSupabaseServiceRoleClient();

      const generateLink = await client.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: { redirectTo: `${baseURL}/auth/validate` },
      });

      if (generateLink.error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: "Unable to generate link"});

      const supabaseLink = generateLink.data.properties.action_link;
      const loginLink = `${baseURL}/auth/preverify?url=${encodeURIComponent(supabaseLink)}`;
      // const user = await ctx.supabase.from("users").select().eq("email", email).single();
      
      if (!config.mailtrapToken)
        throw Error("Mailtrap API token not set")

      const mailClient = new MailtrapClient({ token: config.mailtrapToken });
      
      const body = `Hello ${email},<br />
You've requested to login to Lawnotation. <a href="${ loginLink }">Click here</a> to login to Lawnotation.<br />
If you haven't requested the login, please report to the <a href="mailto:biss-devs@maastrichtuniversity.nl">administrator</a>.<br />
<br />
Cheers!`;

      let mail;
      try {
        mail = await mailClient.send({
          from: {email: 'no-reply@login.lawnotation.org', name: 'Lawnotation'},
          to: [{email}],
          subject: 'Login details for Lawnotation',
          html: body
        })
      } catch (e) {
        if (e instanceof Error) {
          throw new TRPCError({message: 'There was an error sending the email. Please try again later', code: 'INTERNAL_SERVER_ERROR'})
        }
      }

      if (mail && !mail.success)
        throw new TRPCError({message: 'There was an error sending the email. Please try again later', code: 'INTERNAL_SERVER_ERROR'})

      return { message: "Login link has been sent! Please check your inbox" };
    }),

  'otpLogin': publicProcedure
    .input(
      z.string().email()
    )
    .query(async ({ctx, input: email}) => {
      
      const login = await ctx.supabase.auth.signInWithOtp({ email: email })

      if (login.error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error sending token: ${login.error.message}`});
      
      return { message: "Login token has been sent! Please check your inbox" };
    }),
    
})

export type UserRouter = typeof userRouter