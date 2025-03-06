import { TRPCError } from "@trpc/server";
import { string, z } from "zod";
import {
    authorizer,
    protectedProcedure,
    router,
} from "~/server/trpc";
import { zValidEmail } from "~/utils/validators";
import {
    projectEditorAuthorizer,
    taskEditorAuthorizer,
    taskEditorOrAnnotatorAuthorizer,
} from "../authorizers";
import type { User } from "~/types";
import nodemailer from "nodemailer"

const ZEditorFields = z.object({
    project_id: z.number().int(),
    task_id: z.number().int(),
    emails: z.array(zValidEmail),
});

export const editorRouter = router({
    updateAllFromTask: protectedProcedure
        .input(ZEditorFields)
        .use((opts) =>
            authorizer(opts, () =>
                taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
            )
        )
        .mutation(async ({ ctx, input }) => {
            const deleteResult = await ctx.supabase
                .from("editors")
                .delete()
                .eq("task_id", input.task_id);

            if (deleteResult.error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Error in updateAllFromTask.delete: ${deleteResult.error.message}`,
                });

            const newEditors: { user_id: string; task_id: number }[] = [];

            for (let i = 0; i < input.emails.length; i++) {
                const email = input.emails[i];

                const email_found = await ctx.supabase
                    .from("users")
                    .select()
                    .eq("email", email)
                    .maybeSingle();

                let user_id: User["id"] | null = null;

                if (!email_found.data) {
                    // email is a new user.
                    const invite = await ctx.supabase.auth.admin.inviteUserByEmail(
                        email,
                        { data: { assigned_task_id: input.task_id } }
                    );

                    if (invite.error)
                        throw new TRPCError({
                            code: "INTERNAL_SERVER_ERROR",
                            message: `Error inviting: ${invite.error.message}`,
                        });

                    user_id = invite.data.user.id as string;
                } else {
                    // email is already an user
                    user_id = email_found.data.id as string;
                    const user_email = email_found.data.email as string;

                    const config = useRuntimeConfig();
                    // send email to existing user
                    if (!config.smtpUrl) throw Error("Mail connection url is not set.");

                    const mailClient = nodemailer.createTransport(config.smtpUrl);

                    const body = `Hello ${user_email},<br />
                            You have been assigned as an editor to a task. <a href="${config.public.baseURL}/projects/${input.project_id}/tasks/${input.task_id}">Click here</a> to see this task.`;
                    try {
                        const mail = await mailClient.sendMail({
                            from: {
                                name: "Lawnotation",
                                address: "no-reply@login.lawnotation.org"
                            },
                            to: user_email,
                            subject: "Assigned as an editor to new task",
                            html: body,
                        });
                    } catch (error) {
                        throw new TRPCError({
                            message:
                                "There was an error sending an email to the invited user.",
                            code: "INTERNAL_SERVER_ERROR",
                        });
                    }
                }

                if (!user_id)
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: `Error retrieving or inviting the specified user`,
                    });

                newEditors.push({ user_id, task_id: input.task_id });
            }

            const { data, error } = await ctx.supabase
                .from("editors")
                .insert(newEditors)
                .eq("task_id", input.task_id);

            if (error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Error in updateAllFromTask.create: ${error.message}`,
                });
            return true;
        }),

    getAllFromTask: protectedProcedure
        .input(z.number().int())
        .use((opts) =>
            authorizer(opts, () =>
                taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
            )
        )
        .query(async ({ ctx, input: task_id }) => {
            const { data, error } = await ctx.supabase
                .from("editors")
                .select("id, user:users(id, email)")
                .eq("task_id", task_id);

            if (error)
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Error in tasks.getAllFromTask: ${error.message}`,
                });
            return data;
        }),

});

export type EditorRouter = typeof editorRouter;
