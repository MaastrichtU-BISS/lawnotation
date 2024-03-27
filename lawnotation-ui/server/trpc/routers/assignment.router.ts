import { TRPCError } from "@trpc/server";
import { number, z } from "zod";
import { authorizer, protectedProcedure, router } from "~/server/trpc";
import type { Assignment, User, Document, MlModel, Annotation } from "~/types";
import type { Context } from "../context";
import { zValidEmail } from "~/utils/validators";
import { appRouter } from ".";

const config = useRuntimeConfig();

const ZAssignmentFields = z.object({
  annotator_id: z.string().nullable(),
  task_id: z.number().int(),
  document_id: z.number().int(),
  status: z.union([z.literal("pending"), z.literal("done")]),
  seq_pos: z.number().int(),
  difficulty_rating: z.number().int(),
  annotator_number: z.number().int(),
  origin: z.union([z.literal("manual"), z.literal("imported"), z.literal("model")])
});

const assignmentAuthorizer = async (
  assignment_id: number,
  user_id: string,
  ctx: Context
) => {
  const query = ctx.supabase
    .from("assignments")
    .select("*, task:tasks!inner(id, project:projects!inner(editor_id))", {
      count: "exact",
      head: true,
    })
    .eq("id", assignment_id);

  const editor = await query.eq("tasks.projects.editor_id", user_id);

  const annotator = await query.eq("annotator_id", user_id);

  return editor.count === 1 || annotator.count === 1;
  // return true;
};

export const assignmentRouter = router({
  /**
   * This method creates inivites an email to create an account if it doesn't 
   * already have one. Next, it will assign the provided task_id to the metadata
   * of the user account, so that a flash message appears when they log-in.
   * Note that this method doesn't actually create the assignments.
   */
  assignUserToTask: protectedProcedure
    .input(
      z.object({
        email: zValidEmail,
        task_id: z.number()
      })
    )
    .query(async ({ctx, input}) => {
      const serviceClient = ctx.getSupabaseServiceRoleClient();

      const email_found = (await serviceClient.from('users').select('id').eq('email', input.email).maybeSingle());
      let user_id: User['id'] | null = null;
      if (!email_found.data) {
        // email is a new user
        const invite = await serviceClient.auth.admin.inviteUserByEmail(input.email, {data: {assigned_task_id: input.task_id}})

        if (invite.error)
          throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error inviting: ${invite.error.message}`});
        
        user_id = invite.data.user.id as string;
      } else {
        // email is already an user
        user_id = email_found.data.id as string;

        await serviceClient.auth.admin.updateUserById(user_id, {user_metadata: {assigned_task_id: input.task_id}})
      
        // ...
        console.log(`Hypothetically sending notification to user ${user_id} that it is assigned to new task`)
      }

      if (!user_id)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error retrieving or inviting the specified user`});

      return user_id;
    }),

  importAssignments: protectedProcedure
    .input(
      z.object({
        email: zValidEmail,
        task_id: z.number()
      })
    )
    .query(async ({ctx, input}) => {
      const serviceClient = ctx.getSupabaseServiceRoleClient();
      const invite = await serviceClient.auth.admin.inviteUserByEmail(input.email, {data: {invited_task_id: input.task_id}})

      if (invite.error)
        throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: `Error inviting: ${invite.error.message}`});
      
      return ;
    }),

  create: protectedProcedure
    .input(ZAssignmentFields)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .insert(input)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in assignment.create: ${error.message}`,
        });
      return data as Assignment;
    }),

  createMany: protectedProcedure
    .input(
      z.object({
        assignments:  z.array(
          // object is equal to ZAssignmentFields, but with optional's, since partial didn't work. check later
          // ZAssignmentFields.optional()
          z.object({
            annotator_id: z.string().optional(),
            task_id: z.number().int(),
            document_id: z.number().int(),
            status: z.union([z.literal("pending"), z.literal("done")]).optional(),
            seq_pos: z.number().int().optional(),
            difficulty_rating: z.number().int().optional(),
            annotator_number: z.number().int().optional(),
            origin: z.union([z.literal("manual"), z.literal("imported"), z.literal("model")]).optional()
          }),
        ),
        pre_annotations: z.object({
          ml_model_id: z.number().int(),
          reveal: z.boolean()
        }).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .insert(input.assignments)
        .select();

      if(input.pre_annotations) {
        const caller = appRouter.createCaller(ctx);

        // get model
        const model: MlModel = await caller.mlModel.findById(input.pre_annotations.ml_model_id);
        console.log("Model obtained");

        // get labels (If they exist)
        let labels = undefined;
        if(model.labelset_id) {
          labels = (await caller.labelset.findById(model.labelset_id)).labels.map(l => l.name);
        }
        console.log("Labels obtained");

        // get all documents
        const documentPromises: Promise<Document>[] = [];
        const doc2ass: any = {};
        data?.map((ass: Assignment) => {
          if(!(ass.document_id in doc2ass)) {
            documentPromises.push(caller.document.findById(ass.document_id));
            doc2ass[ass.document_id] = [ass.id];
          } else {
            doc2ass[ass.document_id].push(ass.id);
          } 
        });

        const documents = await Promise.all(documentPromises);
        console.log("Documents obtained", documents.length);

        // get annotations from model
        const predictionPromises: Promise<any>[] = [];
        documents?.map((doc: Document) => {
          const response = caller.mlModel.predict({
            text: doc.full_text,
            assignments_id: doc2ass[doc.id],
            model_name: model.name,
            task_type: model.type,
            labels: labels
          });
          predictionPromises.push(response);
        });

        const predictions = await Promise.all(predictionPromises);

        console.log("Predictions were sent", predictions.length);

      }

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in createMany: ${error.message}`,
        });
      return data as Assignment[];
    }),

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        assignmentAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      const { data, error, count } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("id", id)
        .single();

      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in find: ${error.message}`,
        });
      return data as Assignment;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZAssignmentFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .update(input.updates)
        .eq("id", input.id)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in update: ${error.message}`,
        });
      return data as Assignment;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input: assignment_id }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .delete()
        .eq("id", assignment_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in delete: ${error.message}`,
        });
      return true;
    }),

  getCountByUser: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: e_id }) => {
      const { data, error } = await ctx.supabase
        .rpc("get_count_assignments", { e_id: e_id })
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getCountByUser: ${error.message}`,
        });
      return data;
    }),

  getDifficultiesByEditor: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: e_id }) => {
      const { data, error } = await ctx.supabase.rpc(
        "get_difficulties_by_editor",
        {
          e_id: e_id,
        }
      );

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getDifficultiesByEditor: ${error.message}`,
        });
      return data;
    }),

  getCompletionByEditor: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: e_id }) => {
      const { data, error } = await ctx.supabase.rpc(
        "get_completion_by_editor",
        {
          e_id: e_id,
        }
      );

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getCompletionByEditor: ${error.message}`,
        });
      return data;
    }),

  getCompletionByAnnotator: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: a_id }) => {
      const { data, error } = await ctx.supabase.rpc(
        "get_completion_by_annotator",
        {
          a_id: a_id,
        }
      );

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getCompletionByAnnotator: ${error.message}`,
        });
      return data;
    }),

  findAssignmentsByTask: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: task_id }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("task_id", task_id)
        .order("id", { ascending: true });

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByTask: ${error.message}`,
        });
      return data as Assignment[];
    }),

    findAssignmentsByTaskAndUser: protectedProcedure
    .input(z.object({
      annotator_id: z.string().optional(),
      annotator_number: z.number().int().optional(),
      task_id: z.number().int()
    }))
    .query(async ({ ctx, input }) => {
      
      let query = ctx.supabase
      .from("assignments")
      .select()
      .eq("task_id", input.task_id);

      if(input.annotator_id) {
        query = query.eq("annotator_id", input.annotator_id);
      }

      if(input.annotator_number) {
        query = query.eq("annotator_number", input.annotator_number);
      }

      const { data, error } = await query.order("id", { ascending: true });

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByTaskAndUser: ${error.message}`,
        });
      return data as Assignment[];
    }),

  findAssignmentsByUserTaskSeq: protectedProcedure
    .input(
      z.object({
        annotator_id: z.string(),
        task_id: z.number().int(),
        seq_pos: z.number().int(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("task_id", input.task_id)
        .eq("annotator_id", input.annotator_id)
        .eq("seq_pos", input.seq_pos)
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByUserTaskSeq: ${error.message}`,
        });
      return data as Assignment;
    }),

  findAssignmentsByUser: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: user_id }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("annotator_id", user_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByUser: ${error.message}`,
        });
      return data as Assignment[];
    }),

  findNextAssignmentsByUserAndTask: protectedProcedure
    .input(
      z.object({
        annotator_id: z.string(),
        task_id: z.number().int(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .rpc("next_random_assignment", {
          a_id: input.annotator_id,
          t_id: input.task_id,
        })
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findNextAssignmentsByUserAndTask: ${error.message}`,
        });
      return data as Assignment;
    }),

  findNextAssignmentByUser: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: user_id }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("annotator_id", user_id)
        .eq("status", "pending")
        .order("task_id", { ascending: false })
        .order("seq_pos", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findNextAssignmentByUser: ${error.message}`,
        });
      return data as Assignment | null;
    }),

  countAssignmentsByUserAndTask: protectedProcedure
    .input(
      z.object({
        annotator_id: z.string(),
        task_id: z.number().int(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data: next, error: error_next } = await ctx.supabase
        .from("assignments")
        .select("seq_pos")
        .eq("annotator_id", input.annotator_id)
        .eq("task_id", input.task_id)
        .eq("status", "pending")
        .order("seq_pos", { ascending: true })
        .limit(1)
        .maybeSingle();
      // const { data: total, error: error_total } = await ctx.supabase
      const { error: error_total, count } = await ctx.supabase
        .from("assignments")
        // .select("count")
        .select("*", { count: "exact", head: true })
        .eq("annotator_id", input.annotator_id)
        .eq("task_id", input.task_id);
      // .single();

      if (error_next) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in 1 countAssignmentsByUserAndTask: ${error_next.message}`,
        });
      } else if (error_total) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in 2 countAssignmentsByUserAndTask: ${error_total.message}`,
        });
      // return {
      //   next: next?.seq_pos ?? total?.count! + 1, // TODO: need to check if this actually works
      //   total: total?.count ?? 0,
      // };
      } else {
        return {
          next: next?.seq_pos ?? count! + 1, // TODO: need to check if this actually works
          total: count ?? 0,
        };
      }
    }),

  deleteAllFromTask: protectedProcedure
    .input(z.number().int())
    .mutation(async ({ ctx, input: task_id }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .delete()
        .eq("task_id", task_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in deleteAllAssignmentsFromTask: ${error.message}`,
        });
      return true;
    }),
});

export type AssignmentRouter = typeof assignmentRouter;
