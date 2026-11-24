import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, authorizer } from "~/server/trpc";
import {
  assignmentEditorOrAnnotatorAuthorizer,
  taskEditorAuthorizer,
  taskEditorOrAnnotatorAuthorizer,
} from "../authorizers";
import { taskKinds, toKitLevel } from "~/utils/levels";
import { assignmentKey, storeKitAssignment, toKitAssignment } from "~/server/utils/annotation_kit";
import { ZRelationLabel } from "~/server/utils/relation_label";
import type { Sql } from "~/server/db/client";
import * as Q from "~/server/db/queries/annotator";

// What legal-annotation-kit loads and saves, in its own JSON format. The
// conversion to and from lawnotation's tables is in server/utils/annotation_kit.

const ZConfidence = z.number().int().min(0).max(5);
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

export type AnnotatorBundle = Awaited<ReturnType<typeof loadBundle>>;

async function loadBundle(sql: Sql, assignmentId: number) {
  const row = await Q.kitAssignmentById(sql, assignmentId);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

  const annotations = await Q.kitAnnotationsOfAssignment(sql, assignmentId);
  const relations = await Q.kitRelationsFromAnnotations(sql, annotations.map((a) => a.id));
  const documentRelations = await Q.documentRelationsFromAssignment(sql, assignmentId);

  return {
    document: { name: row.document_name, full_text: row.full_text, key: assignmentKey(row.id) },
    assignment: toKitAssignment(row, annotations, relations, documentRelations),
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
      return await Q.queueOfAnnotator(ctx.sql, input.task_id, ctx.user.id);
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
    .query(async ({ ctx, input }) => Q.queueOfAssignment(ctx.sql, input)),

  /**
   * A document's full text, for "Read more" when relating documents: the
   * annotator may want to see what a target is before linking to it. Authorized
   * like opening the assignment itself, so it only ever returns documents of the
   * caller's own queue (or of a task they edit).
   */
  documentPreview: protectedProcedure
    .input(z.object({ assignment_id: z.number().int() }))
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input.assignment_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      const row = await Q.documentOfAssignment(ctx.sql, input.assignment_id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      return row;
    }),

  /**
   * Every document of the queue the assignment belongs to, and the links among
   * them: what the relation graph is drawn from. Each document carries the
   * start of its text so a hover can tell what it is without opening it.
   */
  relationGraph: protectedProcedure
    .input(z.object({ assignment_id: z.number().int() }))
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input.assignment_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      const documents = await Q.queueSnippetsOfAssignment(ctx.sql, input.assignment_id);
      const relations = await Q.documentRelationsAmong(ctx.sql, documents.map((d) => d.assignment_id));
      return { documents, relations };
    }),

  /** Links other documents in the same queue made to this one ("Linked by"). */
  incoming: protectedProcedure
    .input(z.number().int())
    .use((opts) =>
      authorizer(opts, () =>
        assignmentEditorOrAnnotatorAuthorizer(opts.input, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      return await Q.documentRelationsToAssignment(ctx.sql, input);
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
      const task = await Q.taskKindsOfAssignment(ctx.sql, input.assignment_id);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

      try {
        await storeKitAssignment(
          ctx.sql,
          input.assignment_id,
          { ...input.assignment, annotator: "", order: 0 } as any,
          taskKinds(task as any)
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
      const row = await Q.documentWithTaskLevel(ctx.sql, input.task_id, input.document_id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      const annotations = await Q.annotationsOfTaskDocument(ctx.sql, input.task_id, input.document_id);
      const relations = await Q.kitRelationsFromAnnotations(ctx.sql, annotations.map((a) => a.id));

      // Every annotator's links from and to this document. Shown read-only
      // and by document name, since there is no single queue to key them by.
      const outgoing = await Q.documentRelationsFromTaskDocument(ctx.sql, input.task_id, input.document_id);
      const incoming = await Q.documentRelationsToTaskDocument(ctx.sql, input.task_id, input.document_id);

      const merged = toKitAssignment(
        { id: 0, annotator_id: null, seq_pos: 0, status: "", confidence_rating: 0 },
        annotations,
        relations
      );
      return {
        document: { name: row.name, full_text: row.full_text },
        assignment: { ...merged, document_relations: outgoing },
        incoming_relations: incoming,
        annotation_level: toKitLevel(row.annotation_level),
      };
    }),
});
