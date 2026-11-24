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
import type { Sql } from "../db";
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
  confidence_rating: z.number().int(),
  annotator_number: z.number().int(),
  origin: z.nativeEnum(Origins),
  original_task_id: z.number().int().nullable().optional()
});

/** Rows per INSERT, well below Postgres' 65534 parameters per query. */
const INSERT_CHUNK_SIZE = 1000;

/** The keys of an object that are set: the columns an insert or update writes. */
const definedKeys = <T extends object>(obj: T) =>
  (Object.keys(obj) as (keyof T & string)[]).filter(
    (key) => obj[key] !== undefined
  );

type AnnotatorAssignmentNode = {
  type: "document";
  key: string;
  data: {
    assignment_id: number;
    seq_pos: number;
    document_id: number;
    document_name: string;
    annotator_name: string;
    confidence_rating: number;
    status: string;
  };
};

export const assignmentRouter = router({
  /**
   * This method creates a users row for the email if it doesn't already have
   * one and invites them by email; the row is linked to their Keycloak account
   * when they first sign in with that address (see resolveUser). Next, it will
   * assign the provided task_id to the metadata of the user account, so that a
   * flash message appears when they log-in.
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
      let user_id: User["id"] | null = null;
      let user_email: string;
      let is_new_user: boolean;
      try {
        // Find the user by email or create their row, and record the task in
        // its metadata, in one statement so that two invitations of the same
        // address at once can't collide. xmax = 0 only for a freshly inserted
        // row.
        const [row] = await ctx.sql<
          [{ id: string; email: string; created: boolean }]
        >`
          INSERT INTO users (email, metadata)
          VALUES (lower(${input.email}), jsonb_build_object('assigned_task_id', ${input.task_id}::bigint))
          ON CONFLICT ((lower(email))) DO UPDATE
            SET metadata = users.metadata || jsonb_build_object('assigned_task_id', ${input.task_id}::bigint)
          RETURNING id, email, (xmax = 0) AS created
        `;
        user_id = row.id;
        user_email = row.email;
        is_new_user = row.created;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in assignment.assignUserToTask: ${(error as Error).message}`,
        });
      }

      const config = useRuntimeConfig();
      // send email to the user
      if (!config.smtpUrl) throw Error("Mail connection url is not set.");

      const mailClient = nodemailer.createTransport(config.smtpUrl);

      // A new user signs in through Keycloak with this email prefilled, which
      // sends them a code; the users row is linked to that account then.
      const body = is_new_user
        ? `Hello ${user_email},<br />
        You have been invited to annotate a task on Lawnotation. <a href="${config.public.baseURL}/auth/accept-invite#${encodeURIComponent(user_email)}">Click here</a> to accept the invitation and start annotating.`
        : `Hello ${user_email},<br />
        You have been assigned to a new task. <a href="${config.public.baseURL}/annotate/${input.task_id}?seq=1">Click here</a> to start annotating this task.`;
      try {
        const mail = await mailClient.sendMail({
          from: {
            name: "Lawnotation",
            address: "no-reply@login.lawnotation.org"
          },
          to: user_email,
          subject: is_new_user
            ? "Invitation to annotate on Lawnotation"
            : "Assigned to new task",
          html: body,
        });
      } catch (error) {
        throw new TRPCError({
          message:
            "There was an error sending an email to the invited user.",
          code: "INTERNAL_SERVER_ERROR",
        });
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
      // Create the users row if it is missing (linked at their first sign-in)
      // and record the task in its metadata; no email is sent.
      try {
        await ctx.sql`
          INSERT INTO users (email, metadata)
          VALUES (lower(${input.email}), jsonb_build_object('invited_task_id', ${input.task_id}::bigint))
          ON CONFLICT ((lower(email))) DO UPDATE
            SET metadata = users.metadata || jsonb_build_object('invited_task_id', ${input.task_id}::bigint)
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error inviting: ${(error as Error).message}`,
        });
      }

      return;
    }),

  create: disabledProcedure
    .input(ZAssignmentFields)
    .mutation(async ({ ctx, input }) => {
      try {
        const columns = definedKeys(input);
        const [data] = await ctx.sql<Assignment[]>`
          INSERT INTO assignments ${ctx.sql(input, ...columns)}
          RETURNING *
        `;
        return data;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in assignment.create: ${(error as Error).message}`,
        });
      }
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
            confidence_rating: z.number().int().min(0).max(5).optional(),
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

      // As PostgREST did: the columns are those any row sets, a row without
      // one of them gets null there. Inserted in chunks to stay under the
      // parameter limit, all in one transaction so it stays all-or-nothing.
      const columns = [
        ...new Set(assignments.flatMap((ass) => definedKeys(ass))),
      ];
      let data: Assignment[] = [];
      try {
        if (assignments.length)
          data = await ctx.sql.begin(async (transaction) => {
            // postgres.js types a transaction without the call signature it has at
            // runtime; this restores it.
            const tx = transaction as unknown as Sql;
            const inserted: Assignment[] = [];
            for (let i = 0; i < assignments.length; i += INSERT_CHUNK_SIZE) {
              const chunk = assignments.slice(i, i + INSERT_CHUNK_SIZE);
              inserted.push(
                ...(await tx<Assignment[]>`
                  INSERT INTO assignments ${tx(chunk, ...(columns as (keyof (typeof chunk)[number])[]))}
                  RETURNING *
                `)
              );
            }
            return inserted;
          });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in createMany: ${(error as Error).message}`,
        });
      }

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

      return data;
    }),

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: id }) => {
      let rows;
      try {
        rows = await ctx.sql<
          (Assignment & { annotator: { id: string; email: string } | null })[]
        >`
          SELECT a.*,
                 CASE WHEN u.id IS NULL THEN NULL
                      ELSE json_build_object('id', u.id, 'email', u.email) END AS annotator
          FROM assignments AS a
          LEFT JOIN users AS u ON (a.annotator_id = u.id)
          WHERE a.id = ${id}
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in find: ${(error as Error).message}`,
        });
      }
      if (rows.length !== 1)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in find: assignment ${id} not found`,
        });
      return rows[0]!;
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
      let rows: Assignment[];
      try {
        const columns = definedKeys(input.updates);
        rows = columns.length
          ? await ctx.sql<Assignment[]>`
              UPDATE assignments SET ${ctx.sql(input.updates, ...columns)}
              WHERE id = ${input.id}
              RETURNING *
            `
          : await ctx.sql<Assignment[]>`
              SELECT * FROM assignments WHERE id = ${input.id}
            `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in update: ${(error as Error).message}`,
        });
      }
      if (rows.length !== 1)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in update: assignment ${input.id} not found`,
        });
      return rows[0];
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input: assignment_id }) => {
      try {
        await ctx.sql`DELETE FROM assignments WHERE id = ${assignment_id}`;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in delete: ${(error as Error).message}`,
        });
      }
      return true;
    }),

  getCountByUser: disabledProcedure
    .input(z.string())
    .query(async ({ ctx, input: e_id }) => {
      try {
        // numeric, which PostgREST sent as a JSON number.
        const [row] = await ctx.sql<[{ v: number }]>`
          SELECT get_count_assignments(e_id => ${e_id})::int AS v
        `;
        return row.v;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getCountByUser: ${(error as Error).message}`,
        });
      }
    }),

  getCountByProject: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: p_id }) => {
      try {
        const [row] = await ctx.sql<[{ count: number }]>`
          SELECT count(*)::int AS count
          FROM assignments AS a
          INNER JOIN tasks AS t ON (a.task_id = t.id)
          WHERE t.project_id = ${p_id}
        `;
        return row.count;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getCountByUser: ${(error as Error).message}`,
        });
      }
    }),

  getConfidencesByEditor: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await ctx.sql<{ confidence: number; count: number }[]>`
          SELECT * FROM get_confidences_by_editor(e_id => ${ctx.user.id})
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getConfidencesByEditor: ${(error as Error).message}`,
        });
      }
    }),

  getCompletionByEditor: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await ctx.sql<{ status: AssignmentStatuses; count: number }[]>`
          SELECT * FROM get_completion_by_editor(e_id => ${ctx.user.id})
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getCompletionByEditor: ${(error as Error).message}`,
        });
      }
    }),

  getCompletionByAnnotator: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        return await ctx.sql<{ status: AssignmentStatuses; count: number }[]>`
          SELECT * FROM get_completion_by_annotator(a_id => ${ctx.user.id})
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getCompletionByAnnotator: ${(error as Error).message}`,
        });
      }
    }),

  findAssignmentsByTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      try {
        return await ctx.sql<Assignment[]>`
          SELECT * FROM assignments WHERE task_id = ${task_id} ORDER BY id
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByTask: ${(error as Error).message}`,
        });
      }
    }),

  findRichAssignmentsByTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      try {
        return await ctx.sql<
          (Assignment & { documents: { hash: string | null } | null })[]
        >`
          SELECT a.*,
                 CASE WHEN d.id IS NULL THEN NULL
                      ELSE json_build_object('hash', d.hash) END AS documents
          FROM assignments AS a
          LEFT JOIN documents AS d ON (a.document_id = d.id)
          WHERE a.task_id = ${task_id}
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByTask: ${(error as Error).message}`,
        });
      }
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
      const byAnnotatorId = input.annotator_id
        ? ctx.sql`AND annotator_id = ${input.annotator_id}`
        : ctx.sql``;

      const byAnnotatorNumber = input.annotator_number
        ? ctx.sql`AND annotator_number = ${input.annotator_number}`
        : ctx.sql``;

      try {
        return await ctx.sql<Assignment[]>`
          SELECT * FROM assignments
          WHERE task_id = ${input.task_id} ${byAnnotatorId} ${byAnnotatorNumber}
          ORDER BY id
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByTaskAndUser: ${(error as Error).message}`,
        });
      }
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
      try {
        const [data] = await ctx.sql<Assignment[]>`
          SELECT * FROM assignments
          WHERE annotator_id = ${ctx.user.id}
            AND task_id = ${task_id}
            AND status <> ${AssignmentStatuses.DONE}
          ORDER BY seq_pos
          LIMIT 1
        `;
        return (data ?? null) as Assignment;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findNextAssignmentsByUserAndTask: ${(error as Error).message}`,
        });
      }
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

      let seqFilter;

      switch (input.dir) {
        case Direction.PREVIOUS:
          seqFilter = ctx.sql`AND seq_pos < ${input.seq_pos} ORDER BY seq_pos DESC LIMIT 1`;
          break;
        case Direction.CURRENT:
          seqFilter = ctx.sql`AND seq_pos = ${input.seq_pos}`;
          break;
        case Direction.NEXT:
          seqFilter = ctx.sql`AND seq_pos > ${input.seq_pos} ORDER BY seq_pos ASC LIMIT 1`;
          break;
        default:
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Error in findAssignmentsByUserTaskSeq: Direction value was not provided`,
          });
      }

      let rows: Assignment[];
      try {
        rows = await ctx.sql<Assignment[]>`
          SELECT * FROM assignments
          WHERE task_id = ${input.task_id}
            AND annotator_id = ${ctx.user.id}
            ${seqFilter}
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByUserTaskSeq: ${(error as Error).message}`,
        });
      }

      // maybeSingle(): more than one row was an error.
      if (rows.length > 1) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByUserTaskSeq: more than one assignment at this position`,
        });
      }

      return (rows[0] ?? null) as Assignment;
    }),

  findAssignmentsByUser: disabledProcedure
    .input(z.string())
    .query(async ({ ctx, input: user_id }) => {
      try {
        return await ctx.sql<Assignment[]>`
          SELECT * FROM assignments WHERE annotator_id = ${user_id}
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByUser: ${(error as Error).message}`,
        });
      }
    }),

  findNextAssignmentByUser: protectedProcedure
    .query(async ({ ctx }) => {
      const unfinished = [
        AssignmentStatuses.PENDING,
        AssignmentStatuses.PREANNOTATED,
        AssignmentStatuses.FAILED,
      ];
      try {
        const [data] = await ctx.sql<Assignment[]>`
          SELECT * FROM assignments
          WHERE annotator_id = ${ctx.user.id}
            AND status::text IN ${ctx.sql(unfinished)}
          ORDER BY task_id DESC, seq_pos ASC
          LIMIT 1
        `;
        return (data ?? null) as Assignment | null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findNextAssignmentByUser: ${(error as Error).message}`,
        });
      }
    }),

  getCountByTask: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: task_id }) => {
      try {
        const [row] = await ctx.sql<[{ count: number }]>`
          SELECT count(*)::int AS count FROM assignments WHERE task_id = ${task_id}
        `;
        return row.count;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAssignmentsByTask: ${(error as Error).message}`,
        });
      }
    }),

  countAssignmentsByUserAndTask: protectedProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        seq_pos: z.number().int().optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Before a given position, or else those already done.
      const previous =
        input.seq_pos > 0
          ? ctx.sql`seq_pos < ${input.seq_pos}`
          : ctx.sql`status = 'done'`;

      let row: { total: number; previous: number };
      try {
        [row] = await ctx.sql<[{ total: number; previous: number }]>`
          SELECT count(*)::int AS total,
                 (count(*) FILTER (WHERE ${previous}))::int AS previous
          FROM assignments
          WHERE annotator_id = ${ctx.user.id} AND task_id = ${input.task_id}
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in 2 countAssignmentsByUserAndTask: ${(error as Error).message}`,
        });
      }

      return {
        previous: row.previous,
        total: row.total,
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
      try {
        await ctx.sql`DELETE FROM assignments WHERE task_id = ${task_id}`;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in deleteAllAssignmentsFromTask: ${(error as Error).message}`,
        });
      }
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
      try {
        const [row] = await ctx.sql<[{ count: number }]>`
          SELECT count(*)::int AS count FROM assignments
          WHERE task_id = ${task_id} AND status = ${AssignmentStatuses.PREDICTING}
        `;
        return {
          predicting: row.count,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in countMLStatus: ${error}`,
        });
      }
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
        ? rows[0]!.total_annotators
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
          confidence_rating: number;
          status: string;
          total: number;
        }[]
      >`
        SELECT a.id::int AS id, a.seq_pos::int AS seq_pos, a.document_id::int AS document_id,
               d.name AS document_name,
               COALESCE(u.email, CONCAT('annotator ', a.annotator_number)) AS annotator_name,
               a.confidence_rating::int AS confidence_rating, a.status::text AS status,
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
          confidence_rating: r.confidence_rating,
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

      type DocumentRow = {
        id: number;
        name: string;
        assignments: {
          id: number;
          task_id: number;
          seq_pos: number | null;
          annotator_number: number;
          status: AssignmentStatuses;
          confidence_rating: number;
          user: { id: string; email: string } | null;
        }[];
        total: number;
      };

      // Documents with at least one assignment in the task, each with those
      // assignments in queue order.
      const nameFilter = input.filter.document.length
        ? ctx.sql`AND d.name ILIKE ${`%${input.filter.document}%`}`
        : ctx.sql``;

      let data: DocumentRow[];
      let count: number;
      try {
        // The range was inclusive of both ends, so a page has rowsPerPage + 1
        // rows; kept as it was.
        data = await ctx.sql<DocumentRow[]>`
          SELECT d.id, d.name,
                 json_agg(
                   json_build_object(
                     'id', a.id,
                     'task_id', a.task_id,
                     'seq_pos', a.seq_pos,
                     'annotator_number', a.annotator_number,
                     'status', a.status,
                     'confidence_rating', a.confidence_rating,
                     'user', CASE WHEN u.id IS NULL THEN NULL
                                  ELSE json_build_object('id', u.id, 'email', u.email) END
                   )
                   ORDER BY a.seq_pos
                 ) AS assignments,
                 (COUNT(*) OVER ())::int AS total
          FROM documents AS d
          INNER JOIN assignments AS a ON (a.document_id = d.id AND a.task_id = ${input.task_id})
          LEFT JOIN users AS u ON (a.annotator_id = u.id)
          WHERE TRUE ${nameFilter}
          GROUP BY d.id
          ORDER BY d.id
          LIMIT ${rowsPerPage + 1} OFFSET ${(input.page - 1) * rowsPerPage}
        `;

        // The total is only on the rows of a page; a page past the end has
        // none, so ask for it on its own then.
        count = data.length
          ? data[0]!.total
          : (
              await ctx.sql<[{ count: number }]>`
                SELECT count(DISTINCT d.id)::int AS count
                FROM documents AS d
                INNER JOIN assignments AS a ON (a.document_id = d.id AND a.task_id = ${input.task_id})
                WHERE TRUE ${nameFilter}
              `
            )[0].count;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getGroupByAnnotators: ${(error as Error).message}`,
        });
      }

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
            confidence_rating: ass.confidence_rating,
            status: ass.status,
          },
        })),
      }));

      return { data: grouped ?? [], total: count ?? 0 };
    }),
});

export type AssignmentRouter = typeof assignmentRouter;
