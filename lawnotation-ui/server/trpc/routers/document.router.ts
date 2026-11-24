import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Sql } from "~/server/db/client";
import {
  authorizer,
  protectedProcedure,
  disabledProcedure,
  router,
} from "~/server/trpc";
import type { Document } from "~/types";
import {
  documentEditorAuthorizer,
  documentEditorOrAnnotatorAuthorizer,
  projectEditorAuthorizer,
  taskEditorAuthorizer,
} from "../authorizers";
import { extractDocumentText } from "~/server/utils/document_import";
import {
  countDocumentsOfEditor,
  countDocumentsOfProject,
  deleteDocument,
  deleteDocumentsOfProject,
  documentById,
  documentName,
  documentNamesOfProject,
  documentsOfProjectNamed,
  documentsOfProjectPage,
  documentsOfTask,
  findDocuments,
  firstDocumentIds,
  insertDocument,
  insertDocuments,
  randomDocumentIds,
  sharedDocumentsOfTask,
  updateDocument,
} from "~/server/db/queries/documents";
import { one } from "~/server/db/queries/helpers";

// 6 MB of file, as base64 (4 characters per 3 bytes).
const EXTRACT_MAX_BASE64 = Math.ceil((6_000_000 / 3) * 4);

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
        return await findDocuments(ctx.sql, input.filter, input.range);
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
      let rows;
      try {
        rows = await documentById(ctx.sql, id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.findById: ${(error as Error).message}`,
        });
      }
      return one(rows, "Error in documents.findById");
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
      let rows;
      try {
        rows = await insertDocument(ctx.sql, withoutNul(input.document));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.create: ${(error as Error).message}`,
        });
      }
      return one(rows, "Error in documents.create");
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
      try {
        // One transaction, so the documents are all stored or none are, as
        // when this was a single insert. postgres.js types a transaction
        // without the call signature it has at runtime; the cast restores it.
        // The rows come back in the order given.
        return await ctx.sql.begin((transaction) =>
          insertDocuments(transaction as unknown as Sql, documents)
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.createMany: ${(error as Error).message}`,
        });
      }
    }),

  update: disabledProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZDocumentFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let rows;
      try {
        rows = await updateDocument(ctx.sql, input.id, input.updates);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.update: ${(error as Error).message}`,
        });
      }
      return one(rows, "Error in documents.update");
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
        await deleteDocument(ctx.sql, input);
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
        const [rows, count] = await Promise.all([
          documentsOfProjectPage(ctx.sql, input.project_id, input.offset, input.limit),
          countDocumentsOfProject(ctx.sql, input.project_id),
        ]);
        return { rows, count };
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
      let data;
      try {
        data = await documentNamesOfProject(ctx.sql, project_id);
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
        return await documentsOfTask(ctx.sql, task_id);
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
        return await sharedDocumentsOfTask(ctx.sql, task_id);
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
        return await sharedDocumentsOfTask(ctx.sql, task_id, { acrossOriginTasks: true });
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
      let rows;
      try {
        rows = await documentsOfProjectNamed(ctx.sql, project_id, name);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findSharedDocumentsByTask: ${(error as Error).message}`,
        });
      }
      // One document, despite the type it has always been given.
      return one(rows, "Error in findSharedDocumentsByTask") as unknown as Document[];
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
          data = await randomDocumentIds(ctx.sql, input.project_id, input.n);
        } else {
          data = await firstDocumentIds(ctx.sql, input.project_id, input.n);
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
        return await countDocumentsOfProject(ctx.sql, project_id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in totalAmountOfDocs: ${(error as Error).message}`,
        });
      }
    }),

  getCountByUser: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await countDocumentsOfEditor(ctx.sql, ctx.user.id);
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
      let rows;
      try {
        rows = await documentName(ctx.sql, id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getName: ${(error as Error).message}`,
        });
      }
      return one(rows, "Error in getName").name;
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
        await deleteDocumentsOfProject(ctx.sql, project_id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getName: ${(error as Error).message}`,
        });
      }
      return true;
    }),
});
