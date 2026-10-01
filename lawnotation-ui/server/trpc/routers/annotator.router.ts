import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, authorizer } from "~/server/trpc";
import {
  assignmentEditorOrAnnotatorAuthorizer,
  taskEditorAuthorizer,
  taskEditorOrAnnotatorAuthorizer,
} from "../authorizers";
import { isLegacyHtml, toKitLevel } from "~/utils/levels";
import {
  storeKitAssignment,
  toKitAssignment,
  type DbAnnotation,
  type DbAssignment,
  type DbRelation,
} from "~/server/utils/annotation_kit";
import { AnnotationLevels } from "~/utils/enums";

// What legal-annotation-kit loads and saves, in its own JSON format. The
// conversion to and from lawnotation's tables is in server/utils/annotation_kit.

const ZConfidence = z.number().int().min(0).max(5);
const ZRelationLabel = z.enum([
  "Is a",
  "Has a",
  "Belongs to",
  "Implies",
  "Depends on",
  "Related to",
  "Is not",
  "Part of",
]);

const ZKitAssignment = z.object({
  status: z.string(),
  confidence: ZConfidence,
  annotations: z.array(
    z.object({
      id: z.number().int(),
      start: z.number().int().min(0),
      end: z.number().int().min(0),
      label: z.string(),
      text: z.string(),
      confidence: ZConfidence,
      metadata: z.string().nullable().optional(),
      // Only sent for spans on a legacy HTML document; see legacyHtmlMetadata.
      html_metadata: z
        .object({
          start: z.string(),
          end: z.string(),
          startOffset: z.number().int(),
          endOffset: z.number().int(),
          globalOffsets: z.object({ start: z.number().int(), end: z.number().int() }),
        })
        .nullable()
        .optional(),
      relations: z.array(
        z.object({
          to: z.number().int(),
          direction: z.enum(["bi", "left", "right"]),
          labels: z.array(ZRelationLabel),
        })
      ),
    })
  ),
  document_annotations: z.array(
    z.object({
      id: z.number().int(),
      label: z.string(),
      confidence: ZConfidence,
    })
  ),
});

export type AnnotatorBundle = Awaited<ReturnType<typeof loadBundle>>;

async function loadBundle(sql: any, assignmentId: number) {
  const [row] = await sql<
    (DbAssignment & { document_name: string; full_text: string; annotation_level: string })[]
  >`
    SELECT a.id::int AS id, a.annotator_id::text AS annotator_id, a.seq_pos::int AS seq_pos,
           a.status::text AS status, a.difficulty_rating::int AS difficulty_rating,
           d.name AS document_name, d.full_text, t.annotation_level::text AS annotation_level
    FROM assignments AS a
    INNER JOIN documents AS d ON (a.document_id = d.id)
    INNER JOIN tasks AS t ON (a.task_id = t.id)
    WHERE a.id = ${assignmentId}
  `;
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

  const annotations = await sql<DbAnnotation[]>`
    SELECT an.id::int AS id, an.assignment_id::int AS assignment_id, an.start_index::int AS start_index, an.end_index::int AS end_index, an.text, an.label, an.origin::text AS origin, an.ls_id, an.metadata, an.html_metadata, an.confidence_rating::int AS confidence_rating
    FROM annotations AS an
    WHERE an.assignment_id = ${assignmentId}
    ORDER BY an.id
  `;
  const relations = annotations.length
    ? await sql<DbRelation[]>`
        SELECT id::int AS id, from_id::int AS from_id, to_id::int AS to_id, direction::text AS direction, labels::text[] AS labels
        FROM annotation_relations
        WHERE from_id IN ${sql(annotations.map((a: DbAnnotation) => a.id))}
        ORDER BY id
      `
    : [];

  const documentLevel = row.annotation_level === AnnotationLevels.DOCUMENT;
  return {
    document: { name: row.document_name, full_text: row.full_text },
    assignment: toKitAssignment(row, annotations, relations, documentLevel),
    annotation_level: toKitLevel(row.annotation_level),
    legacy_html: isLegacyHtml(row.document_name, row.full_text),
  };
}

export const annotatorRouter = router({
  /** The signed-in user's queue for a task, in the order they annotate it. */
  queue: protectedProcedure
    .input(z.object({ task_id: z.number().int() }))
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorOrAnnotatorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      return await ctx.sql<
        { assignment_id: number; seq_pos: number; status: string; document_name: string }[]
      >`
        SELECT a.id::int AS assignment_id, a.seq_pos::int AS seq_pos, a.status::text AS status,
               d.name AS document_name
        FROM assignments AS a
        INNER JOIN documents AS d ON (a.document_id = d.id)
        WHERE a.task_id = ${input.task_id} AND a.annotator_id = ${ctx.user.id}
        ORDER BY a.seq_pos, a.id
      `;
    }),

  load: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => loadBundle(ctx.sql, input)),

  save: protectedProcedure
    .input(z.object({ assignment_id: z.number().int(), assignment: ZKitAssignment }))
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input.assignment_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .mutation(async ({ ctx, input }) => {
      const [task] = await ctx.sql<{ annotation_level: string }[]>`
        SELECT t.annotation_level::text AS annotation_level
        FROM assignments AS a INNER JOIN tasks AS t ON (a.task_id = t.id)
        WHERE a.id = ${input.assignment_id}
      `;
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

      try {
        await storeKitAssignment(
          ctx.sql,
          input.assignment_id,
          { ...input.assignment, annotator: "", order: 0, document_relations: [] } as any,
          task.annotation_level === AnnotationLevels.DOCUMENT
        );
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in annotator.save: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
      return true;
    }),

  /**
   * Every annotator's work on one document of a task, merged for the editor's
   * read-only overview. Ids are database ids, so they never collide.
   */
  merged: protectedProcedure
    .input(z.object({ task_id: z.number().int(), document_id: z.number().int() }))
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.sql<
        { name: string; full_text: string; annotation_level: string }[]
      >`
        SELECT d.name, d.full_text, t.annotation_level::text AS annotation_level
        FROM documents AS d, tasks AS t
        WHERE d.id = ${input.document_id} AND t.id = ${input.task_id}
      `;
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      const annotations = await ctx.sql<DbAnnotation[]>`
        SELECT an.id::int AS id, an.assignment_id::int AS assignment_id, an.start_index::int AS start_index, an.end_index::int AS end_index, an.text, an.label, an.origin::text AS origin, an.ls_id, an.metadata, an.html_metadata, an.confidence_rating::int AS confidence_rating
        FROM annotations AS an
        INNER JOIN assignments AS a ON (an.assignment_id = a.id)
        WHERE a.task_id = ${input.task_id} AND a.document_id = ${input.document_id}
        ORDER BY an.id
      `;
      const relations = annotations.length
        ? await ctx.sql<DbRelation[]>`
            SELECT id::int AS id, from_id::int AS from_id, to_id::int AS to_id, direction::text AS direction, labels::text[] AS labels
            FROM annotation_relations
            WHERE from_id IN ${ctx.sql(annotations.map((a) => a.id))}
            ORDER BY id
          `
        : [];

      const documentLevel = row.annotation_level === AnnotationLevels.DOCUMENT;
      return {
        document: { name: row.name, full_text: row.full_text },
        assignment: toKitAssignment(
          { id: 0, annotator_id: null, seq_pos: 0, status: "", difficulty_rating: 0 },
          annotations,
          relations,
          documentLevel
        ),
        annotation_level: toKitLevel(row.annotation_level),
        legacy_html: isLegacyHtml(row.name, row.full_text),
      };
    }),
});
