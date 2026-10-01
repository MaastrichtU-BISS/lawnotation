import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, authorizer } from "~/server/trpc";
import {
  assignmentEditorOrAnnotatorAuthorizer,
  taskEditorAuthorizer,
  taskEditorOrAnnotatorAuthorizer,
} from "../authorizers";
import { toKitLevel } from "~/utils/levels";
import {
  assignmentKey,
  storeKitAssignment,
  toKitAssignment,
  type DbAnnotation,
  type DbAssignment,
  type DbDocumentRelation,
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
      metadata: z.string().nullable().optional(),
    })
  ),
  // Document-level links; `to` is the target's assignment id (assignmentKey).
  document_relations: z
    .array(z.object({ to: z.string(), labels: z.array(ZRelationLabel) }))
    .default([]),
});

/** One document in an annotator's queue for a task, keyed for the kit. */
type QueueRow = { assignment_id: number; seq_pos: number; status: string; document_name: string };

async function queueOfAssignment(sql: any, assignmentId: number): Promise<QueueRow[]> {
  return await sql`
    SELECT other.id::int AS assignment_id, other.seq_pos::int AS seq_pos,
           other.status::text AS status, d.name AS document_name
    FROM assignments AS self
    INNER JOIN assignments AS other
      ON (other.task_id = self.task_id AND other.annotator_number = self.annotator_number)
    INNER JOIN documents AS d ON (other.document_id = d.id)
    WHERE self.id = ${assignmentId}
    ORDER BY other.seq_pos, other.id
  `;
}

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
    SELECT an.id::int AS id, an.assignment_id::int AS assignment_id, an.start_index::int AS start_index, an.end_index::int AS end_index, an.text, an.label, an.origin::text AS origin, an.metadata, an.confidence_rating::int AS confidence_rating
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

  const documentRelations = await sql<DbDocumentRelation[]>`
    SELECT from_assignment_id::int AS from_assignment_id, to_assignment_id::int AS to_assignment_id,
           labels::text[] AS labels
    FROM document_relations
    WHERE from_assignment_id = ${assignmentId}
    ORDER BY id
  `;

  const documentLevel = row.annotation_level === AnnotationLevels.DOCUMENT;
  return {
    document: { name: row.document_name, full_text: row.full_text, key: assignmentKey(row.id) },
    assignment: toKitAssignment(row, annotations, relations, documentLevel, documentRelations),
    annotation_level: toKitLevel(row.annotation_level),
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

  /**
   * The queue of the annotator an assignment belongs to, in that task — the
   * documents its links may point at. For views that open one assignment
   * outside the annotate queue (an editor reviewing someone's work).
   */
  queueOf: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => queueOfAssignment(ctx.sql, input)),

  /** Links other documents in the same queue made to this one ("Linked by"). */
  incoming: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      return await ctx.sql<{ from: string; labels: string[] }[]>`
        SELECT d.name || ' (#' || a.seq_pos || ')' AS "from", r.labels::text[] AS labels
        FROM document_relations AS r
        INNER JOIN assignments AS a ON (r.from_assignment_id = a.id)
        INNER JOIN documents AS d ON (a.document_id = d.id)
        WHERE r.to_assignment_id = ${input}
        ORDER BY a.seq_pos, r.id
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
          { ...input.assignment, annotator: "", order: 0 } as any,
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
        SELECT an.id::int AS id, an.assignment_id::int AS assignment_id, an.start_index::int AS start_index, an.end_index::int AS end_index, an.text, an.label, an.origin::text AS origin, an.metadata, an.confidence_rating::int AS confidence_rating
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

      // Every annotator's links from and to this document. Shown read-only
      // and by document name, since there is no single queue to key them by.
      const outgoing = await ctx.sql<{ to: string; labels: string[] }[]>`
        SELECT td.name AS "to", r.labels::text[] AS labels
        FROM document_relations AS r
        INNER JOIN assignments AS fa ON (r.from_assignment_id = fa.id)
        INNER JOIN assignments AS ta ON (r.to_assignment_id = ta.id)
        INNER JOIN documents AS td ON (ta.document_id = td.id)
        WHERE fa.task_id = ${input.task_id} AND fa.document_id = ${input.document_id}
        ORDER BY r.id
      `;
      const incoming = await ctx.sql<{ from: string; labels: string[] }[]>`
        SELECT fd.name AS "from", r.labels::text[] AS labels
        FROM document_relations AS r
        INNER JOIN assignments AS fa ON (r.from_assignment_id = fa.id)
        INNER JOIN assignments AS ta ON (r.to_assignment_id = ta.id)
        INNER JOIN documents AS fd ON (fa.document_id = fd.id)
        WHERE ta.task_id = ${input.task_id} AND ta.document_id = ${input.document_id}
        ORDER BY r.id
      `;

      const documentLevel = row.annotation_level === AnnotationLevels.DOCUMENT;
      const merged = toKitAssignment(
        { id: 0, annotator_id: null, seq_pos: 0, status: "", difficulty_rating: 0 },
        annotations,
        relations,
        documentLevel
      );
      return {
        document: { name: row.name, full_text: row.full_text },
        assignment: { ...merged, document_relations: outgoing },
        incoming_relations: incoming,
        annotation_level: toKitLevel(row.annotation_level),
      };
    }),
});
