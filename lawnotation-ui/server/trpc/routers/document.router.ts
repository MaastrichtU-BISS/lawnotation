import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Sql } from "../db";
import {
  authorizer,
  protectedProcedure,
  disabledProcedure,
  router,
} from "~/server/trpc";
import type { Document } from "~/types";
import type { Context } from "../context";
import {
  documentEditorAuthorizer,
  documentEditorOrAnnotatorAuthorizer,
  projectEditorAuthorizer,
  taskEditorAuthorizer,
} from "../authorizers";
import { extractDocumentText } from "~/server/utils/document_import";

// 6 MB of file, as base64 (4 characters per 3 bytes).
const EXTRACT_MAX_BASE64 = Math.ceil((6_000_000 / 3) * 4);

// Documents carry their full text, so a bulk insert goes in modest chunks:
// a statement stays well under the parameter limit and a sane size.
const DOCUMENTS_PER_INSERT = 200;

// The columns a document is inserted with. A mutable array, as postgres.js's
// types only accept those for the column list of its insert helper.
const DOCUMENT_COLUMNS: ("name" | "project_id" | "source" | "full_text")[] = [
  "name",
  "project_id",
  "source",
  "full_text",
];

const ZDocumentFields = z.object({
  name: z.string(),
  project_id: z.number().int(),
  source: z.string(),
  full_text: z.string()
});

// Postgres text cannot hold NUL (the insert fails with "unsupported
// Unicode escape sequence"), and it turns up in real uploads: pdfjs emits
// it for glyphs some fonts leave unmapped, and a .txt can contain it.
// Removed before storing, so annotation offsets match what is saved.
const withoutNul = <T extends { full_text: string }>(document: T): T => ({
  ...document,
  full_text: document.full_text.replace(/\u0000/g, ""),
});

/** The rows of a query that must return exactly one, or an error saying why not. */
function single<T>(rows: readonly T[], where: string): T {
  if (rows.length !== 1)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Error in ${where}: expected one row, got ${rows.length}`,
    });
  return rows[0]!;
}

export const documentRouter = router({
  /* General Crud Definitions */
  find: disabledProcedure
    .input(
      z.object({
        range: z.tuple([z.number().int(), z.number().int()]).optional(),
        filter: ZDocumentFields.partial().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const conditions = Object.entries(input.filter ?? {})
          .filter(([, value]) => value !== undefined)
          .map(([column, value]) => ctx.sql`${ctx.sql(column)} = ${value as string | number}`);
        const where = conditions.length
          ? ctx.sql`WHERE ${conditions.reduce((all, c) => ctx.sql`${all} AND ${c}`)}`
          : ctx.sql``;
        const range = input.range
          ? ctx.sql`LIMIT ${Math.max(input.range[1] - input.range[0] + 1, 0)} OFFSET ${input.range[0]}`
          : ctx.sql``;
        return (await ctx.sql<Document[]>`SELECT * FROM documents ${where} ${range}`) as Document[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.find: ${(error as Error).message}`,
        });
      }
    }),

  findById: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        documentEditorOrAnnotatorAuthorizer(
          opts.input,
          opts.ctx.user.id,
          opts.ctx
        )
      )
    )
    .query(async ({ ctx, input: id }) => {
      let rows: Document[];
      try {
        rows = await ctx.sql<Document[]>`SELECT * FROM documents WHERE id = ${id}`;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.findById: ${(error as Error).message}`,
        });
      }
      return single(rows, "documents.findById");
    }),

  /**
   * Turns one uploaded file into the text that gets stored and annotated.
   * Files arrive base64-encoded; nothing is stored here — the client creates
   * the document afterwards with the text this returns.
   */
  extractText: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        data: z.string().max(EXTRACT_MAX_BASE64),
      })
    )
    .mutation(async ({ input }) => {
      return { full_text: await extractDocumentText(input.name, Buffer.from(input.data, "base64")) };
    }),

  create: protectedProcedure
    .input(
      z.object({
        document: ZDocumentFields,
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(
          opts.input.document.project_id,
          opts.ctx.user.id,
          opts.ctx
        )
      )
    )
    .mutation(async ({ ctx, input }) => {
      let rows: Document[];
      try {
        rows = await ctx.sql<Document[]>`
          INSERT INTO documents ${ctx.sql(withoutNul(input.document), DOCUMENT_COLUMNS)}
          RETURNING *
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.create: ${(error as Error).message}`,
        });
      }
      return single(rows, "documents.create");
    }),

  // Returns the documents in the order given, which the task import relies on
  // to attach assignments to the right document.
  createMany: protectedProcedure
    .input(
      z.object({
        project_id: z.number().int(),
        documents: z.array(ZDocumentFields.omit({ project_id: true })).min(1),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(opts.input.project_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      const documents = input.documents.map((d) =>
        withoutNul({ ...d, project_id: input.project_id })
      );
      const data: Document[] = [];
      try {
        // One transaction, so the documents are all stored or none are, as
        // when this was a single insert.
        await ctx.sql.begin(async (transaction) => {
          // postgres.js types a transaction without the call signature it has at
          // runtime; this restores it.
          const tx = transaction as unknown as Sql;
          for (let i = 0; i < documents.length; i += DOCUMENTS_PER_INSERT) {
            const chunk = documents.slice(i, i + DOCUMENTS_PER_INSERT);
            data.push(
              ...(await tx<Document[]>`
                INSERT INTO documents ${tx(chunk, DOCUMENT_COLUMNS)}
                RETURNING *
              `)
            );
          }
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.createMany: ${(error as Error).message}`,
        });
      }
      // Ids come from a sequence in row order, so sorting by id restores
      // the input order whatever order Postgres returns the rows in.
      return data.sort((a, b) => a.id - b.id);
    }),

  update: disabledProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZDocumentFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let rows: Document[];
      try {
        rows = await ctx.sql<Document[]>`
          UPDATE documents SET ${ctx.sql(input.updates, Object.keys(input.updates) as (keyof typeof input.updates)[])}
          WHERE id = ${input.id}
          RETURNING *
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.update: ${(error as Error).message}`,
        });
      }
      return single(rows, "documents.update");
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        documentEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.sql`DELETE FROM documents WHERE id = ${input}`;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.delete: ${(error as Error).message}`,
        });
      }
      return true;
    }),

  table: disabledProcedure
    .input(
      z.object({
        project_id: z.number().int(),
        offset: z.number().int(),
        limit: z.number().int(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const [rows, [{ count }]] = await Promise.all([
          ctx.sql<Document[]>`
            SELECT * FROM documents
            WHERE project_id = ${input.project_id}
            LIMIT ${Math.max(input.limit, 0)} OFFSET ${input.offset}
          `,
          ctx.sql<[{ count: number }]>`
            SELECT count(*)::int AS count FROM documents WHERE project_id = ${input.project_id}
          `,
        ]);
        return { rows: rows as Document[], count };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.table: ${(error as Error).message}`,
        });
      }
    }),

  // Extra implementations

  findByProject: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: project_id }) => {
      let data: { id: number; name: string | null }[];
      try {
        data = await ctx.sql<{ id: number; name: string | null }[]>`
          SELECT id, name FROM documents WHERE project_id = ${project_id}
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.findByProject: ${(error as Error).message}`,
        });
      }
      return data.map((d) => {
        return { id: d.id, name: d.name ?? "unnamed" };
      });
    }),

  findDocumentsByTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      try {
        return (await ctx.sql<Document[]>`
          SELECT * FROM get_all_docs_from_task(t_id => ${task_id})
        `) as Document[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findDocumentsByTask: ${(error as Error).message}`,
        });
      }
    }),

  findSharedDocumentsByTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      try {
        return (await ctx.sql<Document[]>`
          SELECT * FROM get_all_shared_docs_from_task(t_id => ${task_id})
        `) as Document[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findSharedDocumentsByTask: ${(error as Error).message}`,
        });
      }
    }),

  findSharedDocumentsByTaskIntra: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      try {
        return (await ctx.sql<Document[]>`
          SELECT * FROM get_all_shared_docs_from_task_intra(t_id => ${task_id})
        `) as Document[];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findSharedDocumentsByTaskIntra: ${(error as Error).message}`,
        });
      }
    }),

  findByProjectAndName: protectedProcedure
    .input(z.object({
      project_id: z.number().int(),
      name: z.string()
    }))
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(opts.input.project_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: { project_id, name } }) => {
      let rows: Document[];
      try {
        rows = await ctx.sql<Document[]>`
          SELECT * FROM documents WHERE project_id = ${project_id} AND name = ${name}
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findSharedDocumentsByTask: ${(error as Error).message}`,
        });
      }
      // One document, despite the type it has always been given.
      return single(rows, "findSharedDocumentsByTask") as unknown as Document[];
    }),

  takeUpToNRandomDocuments: protectedProcedure
    .input(
      z.object({
        project_id: z.number().int(),
        n: z.number().int(),
        randomOrder: z.boolean().default(true),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(
          opts.input.project_id,
          opts.ctx.user.id,
          opts.ctx
        )
      )
    )
    .query(async ({ ctx, input }) => {
      try {
        let data: number[] = [];

        if (input.randomOrder) {
          data = (
            await ctx.sql<{ id: number }[]>`
              SELECT random_sample AS id
              FROM random_sample(n => ${input.n}, pid => ${input.project_id})
            `
          ).map((x) => x.id);
        } else {
          data = (
            await ctx.sql<{ id: number }[]>`
              SELECT id FROM documents
              WHERE project_id = ${input.project_id}
              ORDER BY id
              LIMIT ${input.n}
            `
          ).map((x) => +x.id);
        }

        return data as number[];
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error getting random documents from database`,
        });
      }
    }),

  totalAmountOfDocs: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: project_id }) => {
      try {
        const [{ count }] = await ctx.sql<[{ count: number }]>`
          SELECT count(*)::int AS count FROM documents WHERE project_id = ${project_id}
        `;
        return count;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in totalAmountOfDocs: ${(error as Error).message}`,
        });
      }
    }),

  getCountByUser: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [{ count }] = await ctx.sql<[{ count: number }]>`
        SELECT count(*)::int AS count
        FROM documents AS d
        JOIN projects AS p ON (p.id = d.project_id)
        WHERE p.editor_id = ${ctx.user.id}
      `;
      return count;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error in document.getCountByUser: ${(error as Error).message}`,
      });
    }
  }),

  // TODO: replace with just get whole doc and get name property from there?
  getName: disabledProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: id }) => {
      let rows: { name: string | null }[];
      try {
        rows = await ctx.sql<{ name: string | null }[]>`
          SELECT name FROM documents WHERE id = ${id}
        `;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getName: ${(error as Error).message}`,
        });
      }
      return single(rows, "getName").name;
    }),

  // 'updateDocument' -> update
  // 'deleteDocument' -> 'delete'

  deleteAllFromProject: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        projectEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input: project_id }) => {
      try {
        await ctx.sql`DELETE FROM documents WHERE project_id = ${project_id}`;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getName: ${(error as Error).message}`,
        });
      }
      return true;
    }),
});
