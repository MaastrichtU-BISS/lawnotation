import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Sql } from "~/server/db/client";
import { protectedProcedure, disabledProcedure, router, authorizer } from "~/server/trpc";
import type { Annotation } from "~/types";
import { Origins } from "~/utils/enums";
import { assignmentEditorOrAnnotatorAuthorizer, assignmentsEditorOrAnnotatorAuthorizer, taskEditorAuthorizer } from "../authorizers";
import { TRPCForbidden } from "../errors"

const ZAnnotationFields = z.object({
  label: z.string(),
  assignment_id: z.number().int(),
  start_index: z.number().int(),
  end_index: z.number().int(),
  text: z.string(),
  origin: z.nativeEnum(Origins).nullable().optional(),
  metadata: z.string().nullable().optional(),
  confidence_rating: z.number().int().min(0).max(5).optional(),
  // A tag on the whole document, in a document-level or hybrid task.
  kind: z.enum(["span", "document"]).optional(),
});

// Rows per insert: well under the parameter limit at every column given.
const ANNOTATIONS_PER_INSERT = 1000;

/** The rows of a query that must return exactly one, or an error saying why not. */
function single<T>(rows: readonly T[], where: string): T {
  if (rows.length !== 1)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Error in ${where}: expected one row, got ${rows.length}`,
    });
  return rows[0]!;
}

/**
 * The columns an insert of these rows sets: every field any row has. A field
 * no row has keeps its column default; one only some rows have is null on
 * the others, as with the bulk inserts through PostgREST.
 */
function columnsOf<T extends object>(rows: T[]): (keyof T & string)[] {
  const columns = new Set<string>();
  for (const row of rows)
    for (const [column, value] of Object.entries(row))
      if (value !== undefined) columns.add(column);
  return [...columns] as (keyof T & string)[];
}

export const annotationRouter = router({
  /* General Crud Definitions */
  find: disabledProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZAnnotationFields.partial().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const conditions = Object.entries(input.filter ?? {})
          .filter(([, value]) => value !== undefined)
          .map(([column, value]) =>
            value === null
              ? ctx.sql`${ctx.sql(column)} IS NULL`
              : ctx.sql`${ctx.sql(column)} = ${value as string | number}`
          );
        const where = conditions.length
          ? ctx.sql`WHERE ${conditions.reduce((all, c) => ctx.sql`${all} AND ${c}`)}`
          : ctx.sql``;
        const range = input.range
          ? ctx.sql`LIMIT ${Math.max(input.range[1] - input.range[0] + 1, 0)} OFFSET ${input.range[0]}`
          : ctx.sql``;
        return (await ctx.sql<Annotation[]>`SELECT * FROM annotations ${where} ${range}`) as Annotation[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.find: ${(error as Error).message}`,
        });
      }
    }),

  findById: disabledProcedure
    .input(z.number().int())
    .query(async ({ ctx, input }) => {
      let rows: Annotation[];
      try {
        rows = await ctx.sql<Annotation[]>`SELECT * FROM annotations WHERE id = ${input}`;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.findById: ${(error as Error).message}`,
        });
      }
      return single(rows, "annotation.findById");
    }),

  findByAssignment: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: assignment_id }) => {
      try {
        return (await ctx.sql<Annotation[]>`
          SELECT * FROM annotations WHERE assignment_id = ${assignment_id}
        `) as Annotation[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.findByAssignment: ${(error as Error).message}`,
        });
      }
    }),

  create: disabledProcedure
    .input(ZAnnotationFields)
    .mutation(async ({ ctx, input }) => {
      let rows: Annotation[];
      try {
        rows = await ctx.sql<Annotation[]>`
          INSERT INTO annotations ${ctx.sql(input, columnsOf([input]))}
          RETURNING *
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.create: ${(error as Error).message}`,
        });
      }
      return single(rows, "annotation.create");
    }),

  createMany: protectedProcedure
    .input(z.array(ZAnnotationFields))
    .mutation(async ({ ctx, input }) => {

      const access = await assignmentsEditorOrAnnotatorAuthorizer(
        input.map(x => x.assignment_id), ctx.user.id, ctx
      )
      if (!access) {
        throw TRPCForbidden()
      }

      const data: Annotation[] = [];
      try {
        const columns = columnsOf(input);
        // One transaction, so the annotations are all stored or none are, as
        // when this was a single insert. Rows come back in the order given.
        await ctx.sql.begin(async (transaction) => {
          // postgres.js types a transaction without the call signature it has at
          // runtime; this restores it.
          const tx = transaction as unknown as Sql;
          for (let i = 0; i < input.length; i += ANNOTATIONS_PER_INSERT) {
            const chunk = input.slice(i, i + ANNOTATIONS_PER_INSERT);
            data.push(
              ...(await tx<Annotation[]>`
                INSERT INTO annotations ${tx(chunk, columns)}
                RETURNING *
              `)
            );
          }
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.createMany: ${(error as Error).message}`,
        });
      }
      return data;
    }),

  update: disabledProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZAnnotationFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let rows: Annotation[];
      try {
        rows = await ctx.sql<Annotation[]>`
          UPDATE annotations SET ${ctx.sql(input.updates, columnsOf([input.updates]))}
          WHERE id = ${input.id}
          RETURNING *
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.update: ${(error as Error).message}`,
        });
      }
      return single(rows, "annotation.update");
    }),

  delete: disabledProcedure
    .input(z.number().int())
    .query(async ({ ctx, input }) => {
      try {
        await ctx.sql`DELETE FROM annotations WHERE id = ${input}`;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotation.delete: ${(error as Error).message}`,
        });
      }
      return true;
    }),

  /* Specific Implementations */

  findAnnotationsByTaskAndDocument: protectedProcedure
    .input(
      z.object({
        task_id: z.number(),
        document_id: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await ctx.sql<(Annotation & { assignment: { task_id: number; document_id: number } })[]>`
          SELECT an.*,
                 json_build_object('task_id', a.task_id, 'document_id', a.document_id) AS assignment
          FROM annotations AS an
          JOIN assignments AS a ON (a.id = an.assignment_id)
          WHERE a.task_id = ${input.task_id} AND a.document_id = ${input.document_id}
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAnnotationsByTaskAndDocumentAndLabel: ${(error as Error).message}`,
        });
      }
    }),

  findAnnotationsByTaskAndDocumentAndLabelsAndAnnotators: disabledProcedure
    .input(
      z.object({
        task_id: z.number().int(),
        document_id: z.number().int(),
        label: z.string(),
        annotators: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.annotators.length) return [] as Annotation[];
      try {
        return (await ctx.sql`
          SELECT an.start_index, an.end_index, an.label, an.text,
                 json_build_object(
                   'task_id', a.task_id,
                   'document_id', a.document_id,
                   'annotator', json_build_object('email', u.email)
                 ) AS assignment
          FROM annotations AS an
          JOIN assignments AS a ON (a.id = an.assignment_id)
          JOIN users AS u ON (u.id = a.annotator_id)
          WHERE a.task_id = ${input.task_id}
            AND a.document_id = ${input.document_id}
            AND an.label = ${input.label}
            AND u.email IN ${ctx.sql(input.annotators)}
        `) as unknown as Annotation[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAnnotationsByTaskAndDocumentAndLabel: ${(error as Error).message}`,
        });
      }
    }),

  findAnnotationsByTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      try {
        return (await ctx.sql`
          SELECT an.*,
                 json_build_object(
                   'id', a.id,
                   'task_id', a.task_id,
                   'document_id', a.document_id,
                   'annotator_id', a.annotator_id
                 ) AS assignment
          FROM annotations AS an
          JOIN assignments AS a ON (a.id = an.assignment_id)
          WHERE a.task_id = ${task_id}
          ORDER BY an.id
        `) as unknown as Annotation[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findAnnotationsByTaskAndDocumentAndLabel: ${(error as Error).message}`,
        });
      }
    }),
});

export type AnnotationRouter = typeof annotationRouter;
