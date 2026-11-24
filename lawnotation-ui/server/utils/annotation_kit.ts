// The boundary between lawnotation's tables and legal-annotation-kit's JSON
// format. Everything that renames a column or reshapes a row for the kit lives
// here, so the rest of the app talks in one vocabulary or the other, never both.
import type { Sql } from "~/server/db/client";
import type {
  Annotation as KitAnnotation,
  Assignment as KitAssignment,
  DocumentAnnotation,
} from "legal-annotation-kit";
import { AssignmentStatuses, Origins } from "~/utils/enums";
import type { TaskKinds } from "~/utils/levels";
import {
  annotationKindsOfAssignment,
  deleteAnnotations,
  insertAnnotationFromKit,
  setAssignmentConfidence,
  setAssignmentConfidenceAndStatus,
  updateAnnotationFromKit,
} from "~/server/db/queries/annotations";
import {
  deleteDocumentRelationsFrom,
  deleteRelationsOfAnnotations,
  documentRelationsFrom,
  insertRelation,
  linkableAssignmentIds,
  upsertDocumentRelation,
} from "~/server/db/queries/relations";

export type DbAnnotation = {
  id: number;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  label: string;
  origin: Origins | null;
  metadata: string | null;
  confidence_rating: number | null;
  /** Span, or a tag on the whole document (no extent). */
  kind: "span" | "document";
};

export type DbRelation = {
  id: number;
  from_id: number;
  to_id: number;
  direction: "bi" | "left" | "right";
  labels: string[];
};

/** A link from one assignment's document to another's (document-level). */
export type DbDocumentRelation = {
  from_assignment_id: number;
  to_assignment_id: number;
  labels: string[];
};

/** How the kit refers to a document in lawnotation: by its assignment, since
 * document names are not unique within a task. */
export const assignmentKey = (assignmentId: number) => String(assignmentId);

export type DbAssignment = {
  id: number;
  annotator_id: string | null;
  seq_pos: number;
  status: string;
  confidence_rating: number | null;
};


/**
 * An assignment in the kit's format. Each annotation row says which half of
 * the kit's data it belongs to: a span in `annotations`, a tag on the whole
 * document in `document_annotations`. A hybrid task has both.
 */
export function toKitAssignment(
  assignment: DbAssignment,
  annotations: DbAnnotation[],
  relations: DbRelation[],
  documentRelations: DbDocumentRelation[] = []
): KitAssignment {
  const base = {
    id: assignment.id,
    annotator: assignment.annotator_id ?? "",
    order: assignment.seq_pos,
    status: assignment.status,
    confidence: assignment.confidence_rating ?? 0,
    document_relations: documentRelations.map((r) => ({
      to: assignmentKey(r.to_assignment_id),
      labels: r.labels,
    })),
  };

  return {
    ...base,
    annotations: annotations
      .filter((a) => a.kind !== "document")
      .map<KitAnnotation>((a) => ({
        id: a.id,
        start: a.start_index,
        end: a.end_index,
        label: a.label,
        text: a.text,
        confidence: a.confidence_rating ?? 0,
        metadata: a.metadata ?? null,
        relations: relations
          .filter((r) => r.from_id === a.id)
          .map((r) => ({ to: r.to_id, direction: r.direction, labels: r.labels })),
      })),
    document_annotations: annotations
      .filter((a) => a.kind === "document")
      .map<DocumentAnnotation>((a) => ({
        id: a.id,
        label: a.label,
        confidence: a.confidence_rating ?? 0,
        metadata: a.metadata ?? null,
      })),
  };
}

/**
 * Stores what the kit sent as the assignment's annotations and relations,
 * plus its confidence and status — in one transaction, so a save that fails
 * part-way leaves the previous state untouched.
 *
 * Annotations the kit sent back with an existing id are updated in place, not
 * recreated: their id stays stable across saves, and so does their origin,
 * which the kit does not carry (a pre-annotation stays marked as one).
 * Anything with an id the assignment does not have is new and inserted;
 * existing rows the kit no longer sent are deleted. Relations are rewritten
 * wholesale.
 *
 * `kinds` says what the task holds: spans, document tags, or both (hybrid).
 * Only those are stored, and only rows of those kinds are replaced or deleted.
 * New rows of the two kinds can share a temporary id in the kit (each list
 * numbers its own), so the two are told apart by kind throughout.
 */
export async function storeKitAssignment(
  sql: Sql,
  assignmentId: number,
  kit: KitAssignment,
  kinds: TaskKinds
): Promise<void> {
  await sql.begin(async (transaction) => {
    // postgres.js types a transaction without the call signature it has at
    // runtime; this restores it.
    const tx = transaction as unknown as Sql;
    const handled = [...(kinds.spans ? ["span"] : []), ...(kinds.documents ? ["document"] : [])];
    const existing = handled.length ? await annotationKindsOfAssignment(tx, assignmentId, handled) : [];
    const previous = new Map(existing.map((a) => [a.id, a.kind]));

    type Row = {
      kind: "span" | "document";
      kitId: number;
      label: string;
      start: number;
      end: number;
      text: string;
      confidence: number;
      metadata: string | null;
    };
    const rows: Row[] = [
      ...(kinds.spans
        ? kit.annotations.map<Row>((a) => ({
            kind: "span",
            kitId: a.id,
            label: a.label,
            start: a.start,
            end: a.end,
            text: a.text,
            confidence: a.confidence,
            metadata: a.metadata ?? null,
          }))
        : []),
      ...(kinds.documents
        ? kit.document_annotations.map<Row>((d) => ({
            kind: "document",
            kitId: d.id,
            label: d.label,
            start: 0,
            end: 0,
            text: "",
            confidence: d.confidence,
            metadata: d.metadata ?? null,
          }))
        : []),
    ];
    // An id only counts as an existing row if it is one of this kind.
    const isExisting = (r: Row) => previous.get(r.kitId) === r.kind;

    if (existing.length) {
      const ids = existing.map((a) => a.id);
      await deleteRelationsOfAnnotations(tx, ids);
      const kept = new Set(rows.filter(isExisting).map((r) => r.kitId));
      const dropped = ids.filter((id) => !kept.has(id));
      if (dropped.length) await deleteAnnotations(tx, dropped);
    }

    // Span kit id -> the row's id, to point relations at. Only spans have
    // relations, so document tags (whose temporary ids may repeat a span's)
    // are not in it.
    const stored = new Map<number, number>();
    for (const row of rows) {
      if (isExisting(row)) {
        await updateAnnotationFromKit(tx, row.kitId, row);
        if (row.kind === "span") stored.set(row.kitId, row.kitId);
        continue;
      }
      const id = await insertAnnotationFromKit(tx, assignmentId, row, Origins.MANUAL);
      if (row.kind === "span") stored.set(row.kitId, id);
    }

    if (kinds.spans) {
      for (const a of kit.annotations) {
        for (const r of a.relations) {
          const from = stored.get(a.id);
          const to = stored.get(r.to);
          if (from === undefined || to === undefined) continue;
          await insertRelation(tx, { from_id: from, to_id: to, direction: r.direction, labels: r.labels });
        }
      }
    }

    if (kinds.documents) {
      // A link may only point at another document in the same annotator's
      // queue for this task; anything else is dropped rather than stored.
      const allowed = new Set(await linkableAssignmentIds(tx, assignmentId));
      await deleteDocumentRelationsFrom(tx, assignmentId);
      for (const r of kit.document_relations) {
        const to = Number(r.to);
        if (!allowed.has(to)) continue;
        await upsertDocumentRelation(
          tx,
          { from_assignment_id: assignmentId, to_assignment_id: to, labels: r.labels },
          { onConflict: "update" }
        );
      }
    }

    // Status only ever moves forward to done: a plain Save, or an editor
    // reviewing someone's work, must not reopen a finished assignment.
    if (kit.status === AssignmentStatuses.DONE) {
      await setAssignmentConfidenceAndStatus(tx, assignmentId, kit.confidence, AssignmentStatuses.DONE);
    } else {
      await setAssignmentConfidence(tx, assignmentId, kit.confidence);
    }
  });
}

/**
 * Copies the document-level links among the assignments in `copies` (original
 * id -> new id) onto their copies. Links whose target was not copied are left
 * behind. For replicating and merging tasks.
 */
export async function copyDocumentRelations(
  sql: Sql,
  copies: Record<number, number>
): Promise<void> {
  const ids = Object.keys(copies).map(Number);
  if (!ids.length) return;
  for (const r of await documentRelationsFrom(sql, ids)) {
    const from = copies[r.from_assignment_id];
    const to = copies[r.to_assignment_id];
    if (!from || !to) continue;
    await upsertDocumentRelation(
      sql,
      { from_assignment_id: from, to_assignment_id: to, labels: r.labels },
      { onConflict: "keep" }
    );
  }
}
