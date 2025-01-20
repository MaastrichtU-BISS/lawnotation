import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  authorizer,
  protectedProcedure,
  disabledProcedure,
  router,
} from "~/server/trpc";
import type { Document } from "~/types";
import type { Context } from "../context";
import sanitizeHtml from "sanitize-html";
import {
  documentEditorAuthorizer,
  documentEditorOrAnnotatorAuthorizer,
  projectEditorAuthorizer,
  taskEditorAuthorizer,
} from "../authorizers";
import { readPdfText } from "pdf-text-reader";
import WordExtractor from "word-extractor";
import { DocumentFormats } from "~/utils/enums";

const ZDocumentFields = z.object({
  name: z.string(),
  project_id: z.number().int(),
  source: z.string(),
  full_text: z.string(),
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
      let query = ctx.supabase.from("documents").select();
      if (input.range) query = query.range(input.range[0], input.range[1]);
      if (input.filter) query = query.match(input.filter);

      const { data, error } = await query;

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.find: ${error.message}`,
        });
      return data as Document[];
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
      const { data, error, count } = await ctx.supabase
        .from("documents")
        .select()
        .eq("id", id)
        .single();

      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.findById: ${error.message}`,
        });
      return data as Document;
    }),

  create: protectedProcedure
    .input(
      z.object({
        document: ZDocumentFields,
        preprocess: z.boolean().optional().default(false),
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
      if (input.preprocess) {
        await preProcessText(input.document);
      }

      const { data, error } = await ctx.supabase
        .from("documents")
        .insert(input.document)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.create: ${error.message}`,
        });
      return data as Document;
    }),

  update: disabledProcedure
    .input(
      z.object({
        id: z.number().int(),
        updates: ZDocumentFields.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("documents")
        .update(input.updates)
        .eq("id", input.id)
        .select()
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.update: ${error.message}`,
        });
      return data as Document;
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        documentEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("documents")
        .delete()
        .eq("id", input);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.delete: ${error.message}`,
        });
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
      const { data, error, count } = await ctx.supabase
        .from("documents")
        .select("*", { count: "exact" })
        .eq("project_id", input.project_id)
        .range(input.offset, input.offset + input.limit - 1);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.table: ${error.message}`,
        });
      return { rows: data, count };
    }),

  // Extra implementations

  findByProject: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: project_id }) => {
      const { data, error } = await ctx.supabase
        .from("documents")
        .select("id, name")
        .eq("project_id", project_id);
      ctx.supabase.auth.admin.generateLink;

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in documents.findByProject: ${error.message}`,
        });
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
      const { data, error } = await ctx.supabase.rpc("get_all_docs_from_task", {
        t_id: task_id,
      });

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findDocumentsByTask: ${error.message}`,
        });
      return data as Document[];
    }),

  findSharedDocumentsByTask: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input: task_id }) => {
      const { data, error } = await ctx.supabase.rpc(
        "get_all_shared_docs_from_task",
        { t_id: task_id }
      );

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in findSharedDocumentsByTask: ${error.message}`,
        });
      return data as Document[];
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
        let data = [];

        if (input.randomOrder) {
          data = (
            await ctx.supabase.rpc("random_sample", {
              n: input.n,
              pid: input.project_id,
            })
          ).data as number[];
        } else {
          data = (
            await ctx.supabase
              .from("documents")
              .select("id")
              .eq("project_id", input.project_id)
              .order("id")
              .limit(input.n)
          ).data?.map((x) => +x.id) as number[];
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
      const { data, error, count } = await ctx.supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in totalAmountOfDocs: ${error.message}`,
        });
      return count; // TODO: check if valid. original is data.count
    }),

  getCountByUser: protectedProcedure.query(async ({ ctx }) => {
    const { data, error, count } = await ctx.supabase
      .from("documents")
      .select("*, project:projects!inner(id, editor_id)", { count: "exact" })
      .eq("projects.editor_id", ctx.user.id);

    if (error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error in document.getCountByUser: ${error.message}`,
      });
    return count;
  }),

  // TODO: replace with just get whole doc and get name property from there?
  getName: disabledProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: id }) => {
      const { data, error } = await ctx.supabase
        .from("documents")
        .select("name")
        .eq("id", id)
        .single();

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getName: ${error.message}`,
        });
      return data.name;
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
      const { data, error } = await ctx.supabase
        .from("documents")
        .delete()
        .eq("project_id", project_id);

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in getName: ${error.message}`,
        });
      return true;
    }),
});

async function preProcessText(input: { full_text: string; name: string }) {
  const format = input.name.split(".").pop() as DocumentFormats;

  switch (format) {
    case DocumentFormats.TXT:
      input.full_text = input.full_text;
      break;
    case DocumentFormats.HTML:
      input.full_text = sanitizeFullText(input.full_text);
      break;
    case DocumentFormats.PDF:
      const binary = atob(
        input.full_text.replace("data:application/pdf;base64,", "")
      );
      const pdfText = await getPdfText(binary);
      input.full_text = pdfText;
      break;
    case DocumentFormats.DOC:
      input.full_text = await readWordFile(
        input.full_text.replace("data:application/msword;base64,", "")
      );
      break;
    case DocumentFormats.DOCX:
      input.full_text = await readWordFile(
        input.full_text.replace(
          "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,",
          ""
        )
      );
      break;
    default:
      throw new Error("Unsupported format");
  }
}

async function readWordFile(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const extractor = new WordExtractor();
  const extracted = extractor.extract(buffer);
  const doctext = (await extracted).getBody();
  return doctext;
}

async function getPdfText(data) {
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs");
  const pdfText: string = await readPdfText({ data });
  return pdfText;
}

function sanitizeFullText(full_text: string) {
  const sanitized = sanitizeHtml(full_text, {
    allowedAttributes: {
      "*": [
        "style",
        "height",
        "width",
        "valign",
        "border",
        "cellspacing",
        "cellpadding",
      ],
    },
    allowedStyles: {
      "*": {
        color: [
          /^#(0x)?[0-9a-f]+$/i,
          /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,
        ],
        "background-color": [
          /^#(0x)?[0-9a-f]+$/i,
          /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,
        ],
        background: [
          /^#(0x)?[0-9a-f]+$/i,
          /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,
        ],
        "text-align": [/^left$/, /^right$/, /^center$/],
        display: [/^inline$/, /^block$/, /^flex$/, /^inline-block$/, /^grid$/],
        "font-size": [/^\d+(?:px|em|%|rem)$/],
        padding: [/^^\d+(?:px|em|%|rem|)(\s\d+(?:px|em|%|rem|)?)?$/],
        margin: [/^\d+(?:px|em|%|rem|)(\s\d+(?:px|em|%|rem|)?)?$/],
        "border-radius": [/^\d+(?:px|em|%|rem|)(\s\d+(?:px|em|%|rem|)?)?$/],
        float: [/^left$/, /^right$/, /^top$/, /^bottom$/],
        clear: [/^none$/, /^left$/, /^right$/, /^both$/],
        width: [/^\d+(?:px|em|%|rem|)$/],
        "max-width": [/^\d+(?:px|em|%|rem|)$/],
        height: [/^\d+(?:px|em|%|rem|)$/],
        "max-height": [/^\d+(?:px|em|%|rem|)$/],
      },
    },
  });

  return sanitized;
}

export type DocumentRouter = typeof documentRouter;
