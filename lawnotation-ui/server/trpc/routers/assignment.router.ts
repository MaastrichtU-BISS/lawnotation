import { TRPCError } from "@trpc/server";
import { number, z } from "zod";
import { authorizer, protectedProcedure, disabledProcedure, router } from "~/server/trpc";
import type {
  Assignment,
  User,
  Document,
  MlModel,
  Annotation,
  Labelset,
} from "~/types";
import type { Context } from "../context";
import { appRouter } from ".";
import { zValidEmail } from "~/utils/validators";
import nodemailer from "nodemailer"
import postgres from "postgres";
import { Origins, AssignmentStatuses, Direction } from "~/utils/enums";
import { assignmentEditorAuthorizer, assignmentEditorOrAnnotatorAuthorizer, projectEditorAuthorizer, taskEditorAuthorizer, taskEditorOrAnnotatorAuthorizer } from "../authorizers";

const ZAssignmentFields = z.object({
  annotator_id: z.string().nullable(),
  task_id: z.number().int(),
  document_id: z.number().int(),
  status: z.nativeEnum(AssignmentStatuses),
  seq_pos: z.number().int(),
  difficulty_rating: z.number().int(),
  annotator_number: z.number().int(),
  origin: z.nativeEnum(Origins),
  original_task_id: z.number().int().nullable().optional()
});

type AnnotatorAssignmentNode = {
  type: "document";
  key: string;
  data: {
    assignment_id: number;
    seq_pos: number;
    document_id: number;
    document_name: string;
    annotator_name: string;
    difficulty_rating: number;
    status: string;
  };
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
        task_id: z.number(),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      const email_found = await ctx.supabase
        .from("users")
        .select()
        .eq("email", input.email)
        .maybeSingle();
      let user_id: User["id"] | null = null;
      if (!email_found.data) {
        // email is a new user.
        const invite = await ctx.supabase.auth.admin.inviteUserByEmail(
          input.email,
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

        await ctx.supabase.auth.admin.updateUserById(user_id, {
          user_metadata: { assigned_task_id: input.task_id },
        });

        const config = useRuntimeConfig();
        // send email to existing user
        if (!config.smtpUrl) throw Error("Mail connection url is not set.");

        const mailClient = nodemailer.createTransport(config.smtpUrl);

        const body = `Hello ${user_email},<br />
        You have been assigned to a new task. <a href="${config.public.baseURL}/annotate/${input.task_id}?seq=1">Click here</a> to start annotating this task.`;
        try {
          const mail = await mailClient.sendMail({
            from: {
              name: "Lawnotation",
              address: "no-reply@login.lawnotation.org"
            },
            to: user_email,
            subject: "Assigned to new task",
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

      return user_id;
    }),

  importAssignments: disabledProcedure
    .input(
      z.object({
        email: zValidEmail,
        task_id: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const invite = await ctx.supabase.auth.admin.inviteUserByEmail(
        input.email,
        { data: { invited_task_id: input.task_id } }
      );

      if (invite.error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error inviting: ${invite.error.message}`,
        });

      return;
    }),

  create: disabledProcedure
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
        task_id: z.number().int(),
        assignments: z.array(
          // object is equal to ZAssignmentFields, but with optional's, since partial didn't work. check later
          // ZAssignmentFields.optional()
          z.object({
            annotator_id: z.string().optional(),
            document_id: z.number().int(),
            status: z.nativeEnum(AssignmentStatuses).optional(),
            seq_pos: z.number().int().optional(),
            difficulty_rating: z.number().int().min(0).max(5).optional(),
            annotator_number: z.number().int().optional(),
            origin: z.nativeEnum(Origins).optional(),
            original_task_id: z.number().int().nullable().optional()
          })
        ),
        pre_annotations: z
          .object({
            ml_model_id: z.number().int(),
            labelset_id: z.number().int().optional(),
            reveal: z.boolean(),
          })
          .optional(),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {

      const assignments = input.assignments.map(ass => ({...ass, task_id: input.task_id}))

      const { data, error } = await ctx.supabase
        .from("assignments")
        .insert(assignments)
        .select();

      if (input.pre_annotations) {
        const caller = appRouter.createCaller(ctx);

        // get model
        const model: MlModel = await caller.mlModel.findById(
          input.pre_annotations.ml_model_id
        );

        // get labels (If they exist)
        let labels: string[] = [];
        if (input.pre_annotations?.labelset_id) {
          labels.push(
            ...(
              await caller.labelset.findById(input.pre_annotations?.labelset_id)
            ).labels.map((l: any) => l.name)
          );
        } else if (model.labelset_id) {
          labels.push(
            ...(await caller.labelset.findById(model.labelset_id)).labels.map(
              (l: any) => l.name
            )
          );
        }

        // get all documents
        const documentPromises: Promise<Document>[] = [];
        const doc2ass: any = {};
        data?.map((ass: Assignment) => {
          if (!(ass.document_id in doc2ass)) {
            documentPromises.push(caller.document.findById(ass.document_id));
            doc2ass[ass.document_id] = [ass.id];
          } else {
            doc2ass[ass.document_id].push(ass.id);
          }
        });

        const documents = await Promise.all(documentPromises);

        // call the model to create and save the anotations
        documents?.map((doc: Document) => {
          const response = caller.mlModel.predict({
            text: doc.full_text,
            assignment_ids: doc2ass[doc.id],
            name: model.name,
            type: model.type,
            labels: labels,
          });
        });
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
        assignmentEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      const { data, error, count } = await ctx.supabase
        .from("assignments")
        .select("*, annotator:users(id, email)")
        .eq("id", id)
        .single();

      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in find: ${error.message}`,
        });
      return data;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZAssignmentFields.omit({'task_id': true}).partial(),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input.id, opts.ctx.user.id, opts.ctx)
      )
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
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
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

  getCountByUser: disabledProcedure
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

  getCountByProject: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: p_id }) => {
      const { data, error, count } = await ctx.supabase
        .from("assignments")
        .select("*, task:tasks!inner(project_id)", { count: "exact" })
        .eq("tasks.project_id", p_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getCountByUser: ${error.message}`,
        });
      return count;
    }),

  getDifficultiesByEditor: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase.rpc(
        "get_difficulties_by_editor",
        {
          e_id: ctx.user.id,
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
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase.rpc(
        "get_completion_by_editor",
        {
          e_id: ctx.user.id,
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
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase.rpc(
        "get_completion_by_annotator",
        {
          a_id: ctx.user.id,
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
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
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

  findRichAssignmentsByTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select("*, documents(hash)")
        .eq("task_id", task_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByTask: ${error.message}`,
        });
      return data;
    }),

  findAssignmentsByTaskAndUser: protectedProcedure
    .input(
      z.object({
        annotator_id: z.string().optional(),
        annotator_number: z.number().int().optional(),
        task_id: z.number().int(),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from("assignments")
        .select()
        .eq("task_id", input.task_id);

      if (input.annotator_id) {
        query = query.eq("annotator_id", input.annotator_id);
      }

      if (input.annotator_number) {
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
  
  findNextAssignmentsByUserAndTask: protectedProcedure
    .input(
      z.number().int()
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("annotator_id", ctx.user.id)
        .eq("task_id", task_id)
        .neq("status", AssignmentStatuses.DONE)
        .order("seq_pos", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findNextAssignmentsByUserAndTask: ${error.message}`,
        });
      return data as Assignment;
    }),

  findAssignmentsByUserTaskSeq: protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        seq_pos: z.number().int(),
        dir: z.nativeEnum(Direction)
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorOrAnnotatorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {

      let response;

      switch (input.dir) {
        case Direction.PREVIOUS:
          response = await ctx.supabase
            .from("assignments")
            .select()
            .eq("task_id", input.task_id)
            .eq("annotator_id", ctx.user.id)
            .lt("seq_pos", input.seq_pos)
            .order("seq_pos", { ascending: false })
            .limit(1)
            .maybeSingle();
          break;
        case Direction.CURRENT:
          response = await ctx.supabase
            .from("assignments")
            .select()
            .eq("task_id", input.task_id)
            .eq("annotator_id", ctx.user.id)
            .eq("seq_pos", input.seq_pos)
            .maybeSingle();
          break;
        case Direction.NEXT:
          response = await ctx.supabase
            .from("assignments")
            .select()
            .eq("task_id", input.task_id)
            .eq("annotator_id", ctx.user.id)
            .gt("seq_pos", input.seq_pos)
            .order("seq_pos", { ascending: true })
            .limit(1)
            .maybeSingle();
          break;
        default:
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Error in findAssignmentsByUserTaskSeq: Direction value was not provided`,
          });
      }

      if (response.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByUserTaskSeq: ${response.error.message}`,
        });
      }

      return response.data as Assignment;
    }),

  findAssignmentsByUser: disabledProcedure
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

  findNextAssignmentByUser: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from("assignments")
        .select()
        .eq("annotator_id", ctx.user.id)
        .in("status", [
          AssignmentStatuses.PENDING,
          AssignmentStatuses.PREANNOTATED,
          AssignmentStatuses.FAILED,
        ])
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

  getCountByTask: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: task_id }) => {
      const { count, error } = await ctx.supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .eq("task_id", task_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByTask: ${error.message}`,
        });
      return count as number;
    }),

  countAssignmentsByUserAndTask: protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        seq_pos: z.number().int().optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const query = ctx.supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .eq("annotator_id", ctx.user.id)
        .eq("task_id", input.task_id);

      const { count: total_count, error: error_total } = await query;

      if (error_total) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in 2 countAssignmentsByUserAndTask: ${error_total.message}`,
        });
      }

      let previous_count = 0;

      if (input.seq_pos > 0) {
        previous_count = (await query.lt("seq_pos", input.seq_pos)).count ?? 0;
      } else {
        previous_count = (await query.eq("status", "done")).count ?? 0;
      }

      return {
        previous: previous_count,
        total: total_count ?? 0,
      };
    }),

  deleteAllFromTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
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

  countMLStatus: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      // const pre = await ctx.supabase
      //   .from("assignments")
      //   .select("*", { count: "exact", head: true })
      //   .eq("task_id", task_id)
      //   .eq("status", "pre-annotated");

      // const failed = await ctx.supabase
      //   .from("assignments")
      //   .select("*", { count: "exact", head: true })
      //   .eq("task_id", task_id)
      //   .eq("status", "failed");

      const { count, error } = await ctx.supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .eq("task_id", task_id)
        .eq("status", AssignmentStatuses.PREDICTING);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in countMLStatus: ${error}`,
        });
      return {
        predicting: count ?? 0,
      };
    }),

  /**
   * One row per annotator of a task, with their progress — counted in the
   * database, not by fetching every assignment. Their documents are loaded
   * separately (getAnnotatorAssignments) when a row is expanded, so the page
   * costs the same with ten documents or ten thousand.
   */
  getGroupByAnnotators: protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        page: z.number().int(),
        filter: z.object({
          name: z.string(),
        }),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      const rowsPerPage = 10;

      const sanitizedFilter = input.filter.name.replace(/[%_]/g, "");
      const annotatorName = ctx.sql.unsafe(
        "COALESCE(MAX(u.email), CONCAT('annotator ', a.annotator_number))"
      );
      const nameFilter = sanitizedFilter
        ? ctx.sql`HAVING ${annotatorName} ILIKE ${"%" + sanitizedFilter + "%"}`
        : ctx.sql``;
      const unfinished = [
        AssignmentStatuses.PENDING,
        AssignmentStatuses.PREANNOTATED,
        AssignmentStatuses.FAILED,
      ];

      const rows = await ctx.sql<
        {
          annotator_number: number;
          name: string;
          amount_done: number;
          amount_total: number;
          next_seq_pos: number | null;
          total_annotators: number;
        }[]
      >`
        SELECT a.annotator_number::int AS annotator_number,
               ${annotatorName} AS name,
               (COUNT(*) FILTER (WHERE a.status = ${AssignmentStatuses.DONE}::assignment_status))::int AS amount_done,
               COUNT(*)::int AS amount_total,
               (MIN(a.seq_pos) FILTER (WHERE a.status::text IN ${ctx.sql(unfinished)}))::int AS next_seq_pos,
               (COUNT(*) OVER ())::int AS total_annotators
        FROM assignments AS a
        LEFT JOIN users AS u ON (a.annotator_id = u.id)
        WHERE a.task_id = ${input.task_id}
        GROUP BY a.annotator_number
        ${nameFilter}
        ORDER BY a.annotator_number
        LIMIT ${rowsPerPage} OFFSET ${(input.page - 1) * rowsPerPage}
      `;

      // The total is only on the rows of a page; a page past the end has none,
      // so ask for it on its own then.
      const total = rows.length
        ? rows[0].total_annotators
        : (
            await ctx.sql`
              SELECT DISTINCT annotator_number FROM assignments WHERE task_id = ${input.task_id}
            `
          ).count;

      const grouped = rows.map((r) => ({
        type: "annotator" as const,
        key: `ann-${r.annotator_number}`,
        // Not a leaf: the tree shows an expander and asks for the children.
        leaf: false,
        data: {
          annotator_number: r.annotator_number,
          name: r.name,
          amount_done: r.amount_done,
          amount_total: r.amount_total,
          next_seq_pos: r.next_seq_pos ?? 0,
        },
        children: [] as AnnotatorAssignmentNode[],
      }));

      return { data: grouped, total: total ?? 0 };
    }),

  /** One page of an annotator's documents in a task, in queue order. */
  getAnnotatorAssignments: protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        annotator_number: z.number().int(),
        offset: z.number().int().min(0),
        limit: z.number().int().min(1).max(200),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.sql<
        {
          id: number;
          seq_pos: number;
          document_id: number;
          document_name: string;
          annotator_name: string;
          difficulty_rating: number;
          status: string;
          total: number;
        }[]
      >`
        SELECT a.id::int AS id, a.seq_pos::int AS seq_pos, a.document_id::int AS document_id,
               d.name AS document_name,
               COALESCE(u.email, CONCAT('annotator ', a.annotator_number)) AS annotator_name,
               a.difficulty_rating::int AS difficulty_rating, a.status::text AS status,
               (COUNT(*) OVER ())::int AS total
        FROM assignments AS a
        INNER JOIN documents AS d ON (a.document_id = d.id)
        LEFT JOIN users AS u ON (a.annotator_id = u.id)
        WHERE a.task_id = ${input.task_id} AND a.annotator_number = ${input.annotator_number}
        ORDER BY a.seq_pos, a.id
        LIMIT ${input.limit} OFFSET ${input.offset}
      `;

      const data: AnnotatorAssignmentNode[] = rows.map((r) => ({
        type: "document",
        key: `ass-${r.id}`,
        data: {
          assignment_id: r.id,
          seq_pos: r.seq_pos,
          document_id: r.document_id,
          document_name: r.document_name,
          annotator_name: r.annotator_name,
          difficulty_rating: r.difficulty_rating,
          status: r.status,
        },
      }));
      return { data, total: rows[0]?.total ?? 0 };
    }),

  /**
   * Removes every assignment of the given annotators in a task — what ticking
   * an annotator means, whether or not all their documents were loaded.
   */
  deleteByAnnotators: protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        annotator_numbers: z.array(z.number().int()).min(1),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.sql`
        DELETE FROM assignments
        WHERE task_id = ${input.task_id} AND annotator_number IN ${ctx.sql(input.annotator_numbers)}
      `;
      return deleted.count;
    }),

  getGroupByDocuments: protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        page: z.number().int(),
        filter: z.object({
          document: z.string(),
        }),
        // sort: z.object({
        //   field: z.union([
        //     z.literal('name'),
        //     z.literal('progress')
        //   ])
        // })
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      const rowsPerPage = 10;

      const query = ctx.supabase
        .from("documents")
        .select(
          "id, name, assignments!inner(id, task_id, seq_pos, annotator_number, status, difficulty_rating, user:users(id, email))",
          { count: "exact" }
        )
        .eq("assignments.task_id", input.task_id)
        .order("seq_pos", { referencedTable: "assignments", ascending: true })
        .range((input.page - 1) * rowsPerPage, input.page * rowsPerPage);

      if (input.filter.document.length)
        query.ilike("name", `%${input.filter.document}%`);

      const { data, error, count } = await query;

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getGroupByAnnotators: ${error.message}`,
        });

      const grouped = data.map((doc) => ({
        type: "document",
        key: `doc-${doc.id}`,
        data: {
          document_id: doc!.id,
          document_name: doc!.name,
          amount_done: doc.assignments.filter(
            (ass) => ass.status == AssignmentStatuses.DONE
          ).length,
          amount_total: doc.assignments.length,
          next_seq_pos: Math.min(
            ...doc.assignments
              .filter((doc) =>
                [
                  AssignmentStatuses.PENDING,
                  AssignmentStatuses.PREANNOTATED,
                  AssignmentStatuses.FAILED,
                ].includes(doc.status)
              )
              .map((ass) => ass.seq_pos!)
          ),
        },
        children: doc.assignments!.map((ass) => ({
          type: "annotator",
          key: `ass-${ass.id}`,
          data: {
            assignment_id: ass.id,
            name: ass.user?.email ?? `annotator ${ass.annotator_number}`,
            seq_pos: ass.seq_pos,
            difficulty_rating: ass.difficulty_rating,
            status: ass.status,
          },
        })),
      }));

      return { data: grouped ?? [], total: count ?? 0 };
    }),
});

export type AssignmentRouter = typeof assignmentRouter;
