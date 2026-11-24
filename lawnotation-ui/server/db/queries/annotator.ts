import type { Sql } from "~/server/db/client";
import type { Origins } from "~/utils/enums";

// What the annotator (legal-annotation-kit) loads and shows. The row types
// match those of server/utils/annotation_kit, which converts them.

/** One document in an annotator's queue for a task. */
export type QueueRow = { assignment_id: number; seq_pos: number; status: string; document_name: string };

/** An assignment with its document and the task's annotation level. */
export type KitAssignmentRow = {
  id: number;
  annotator_id: string | null;
  seq_pos: number;
  status: string;
  confidence_rating: number | null;
  document_name: string;
  full_text: string;
  annotation_level: string;
};

export type AnnotationRow = {
  id: number;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  label: string;
  origin: Origins | null;
  metadata: string | null;
  confidence_rating: number | null;
  kind: "span" | "document";
};

export type AnnotationRelationRow = {
  id: number;
  from_id: number;
  to_id: number;
  direction: "bi" | "left" | "right";
  labels: string[];
};

export type DocumentRelationRow = { from_assignment_id: number; to_assignment_id: number; labels: string[] };

/** A user's queue for a task, in the order they annotate it. */
export function queueOfAnnotator(sql: Sql, taskId: number, annotatorId: string) {
  return sql<QueueRow[]>`
    SELECT a.id::int AS assignment_id, a.seq_pos::int AS seq_pos, a.status::text AS status,
           d.name AS document_name
    FROM assignments AS a
    INNER JOIN documents AS d ON (a.document_id = d.id)
    WHERE a.task_id = ${taskId} AND a.annotator_id = ${annotatorId}
    ORDER BY a.seq_pos, a.id
  `;
}

/** The queue (same task, same annotator number) an assignment belongs to. */
export function queueOfAssignment(sql: Sql, assignmentId: number) {
  return sql<QueueRow[]>`
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

/** The queue of an assignment with the first 300 characters of each document. */
export function queueSnippetsOfAssignment(sql: Sql, assignmentId: number) {
  return sql<{ assignment_id: number; seq_pos: number; document_name: string; snippet: string }[]>`
    SELECT other.id::int AS assignment_id, other.seq_pos::int AS seq_pos,
           d.name AS document_name, left(d.full_text, 300) AS snippet
    FROM assignments AS self
    INNER JOIN assignments AS other
      ON (other.task_id = self.task_id AND other.annotator_number = self.annotator_number)
    INNER JOIN documents AS d ON (other.document_id = d.id)
    WHERE self.id = ${assignmentId}
    ORDER BY other.seq_pos, other.id
  `;
}

/** An assignment with its document and annotation level, or undefined. */
export async function kitAssignmentById(sql: Sql, assignmentId: number) {
  const [row] = await sql<KitAssignmentRow[]>`
    SELECT a.id::int AS id, a.annotator_id::text AS annotator_id, a.seq_pos::int AS seq_pos,
           a.status::text AS status, a.confidence_rating::int AS confidence_rating,
           d.name AS document_name, d.full_text, t.annotation_level::text AS annotation_level
    FROM assignments AS a
    INNER JOIN documents AS d ON (a.document_id = d.id)
    INNER JOIN tasks AS t ON (a.task_id = t.id)
    WHERE a.id = ${assignmentId}
  `;
  return row;
}

/** The name and text of an assignment's document, or undefined. */
export async function documentOfAssignment(sql: Sql, assignmentId: number) {
  const [row] = await sql<{ name: string; full_text: string }[]>`
    SELECT d.name, d.full_text
    FROM assignments AS a INNER JOIN documents AS d ON (a.document_id = d.id)
    WHERE a.id = ${assignmentId}
  `;
  return row;
}

/** The annotation level and document labelset of an assignment's task, or undefined. */
export async function taskKindsOfAssignment(sql: Sql, assignmentId: number) {
  const [row] = await sql<{ annotation_level: string; document_labelset_id: number | null }[]>`
    SELECT t.annotation_level::text AS annotation_level, t.document_labelset_id::int AS document_labelset_id
    FROM assignments AS a INNER JOIN tasks AS t ON (a.task_id = t.id)
    WHERE a.id = ${assignmentId}
  `;
  return row;
}

/** A document's name and text with a task's annotation level, or undefined if either is missing. */
export async function documentWithTaskLevel(sql: Sql, taskId: number, documentId: number) {
  const [row] = await sql<{ name: string; full_text: string; annotation_level: string }[]>`
    SELECT d.name, d.full_text, t.annotation_level::text AS annotation_level
    FROM documents AS d, tasks AS t
    WHERE d.id = ${documentId} AND t.id = ${taskId}
  `;
  return row;
}

/** An assignment's annotations, by id. */
export function kitAnnotationsOfAssignment(sql: Sql, assignmentId: number) {
  return sql<AnnotationRow[]>`
    SELECT an.id::int AS id, an.assignment_id::int AS assignment_id, an.start_index::int AS start_index, an.end_index::int AS end_index, an.text, an.label, an.origin::text AS origin, an.metadata, an.confidence_rating::int AS confidence_rating, an.kind
    FROM annotations AS an
    WHERE an.assignment_id = ${assignmentId}
    ORDER BY an.id
  `;
}

/** Every annotator's annotations on one document of a task, by id. */
export function annotationsOfTaskDocument(sql: Sql, taskId: number, documentId: number) {
  return sql<AnnotationRow[]>`
    SELECT an.id::int AS id, an.assignment_id::int AS assignment_id, an.start_index::int AS start_index, an.end_index::int AS end_index, an.text, an.label, an.origin::text AS origin, an.metadata, an.confidence_rating::int AS confidence_rating, an.kind
    FROM annotations AS an
    INNER JOIN assignments AS a ON (an.assignment_id = a.id)
    WHERE a.task_id = ${taskId} AND a.document_id = ${documentId}
    ORDER BY an.id
  `;
}

/** The relations starting at any of these annotations, by id (none for no annotations). */
export async function kitRelationsFromAnnotations(sql: Sql, annotationIds: readonly number[]) {
  if (!annotationIds.length) return [];
  return await sql<AnnotationRelationRow[]>`
    SELECT id::int AS id, from_id::int AS from_id, to_id::int AS to_id, direction::text AS direction, labels::text[] AS labels
    FROM annotation_relations
    WHERE from_id IN ${sql(annotationIds as number[])}
    ORDER BY id
  `;
}

/** The document-level links an assignment makes, by id. */
export function documentRelationsFromAssignment(sql: Sql, assignmentId: number) {
  return sql<DocumentRelationRow[]>`
    SELECT from_assignment_id::int AS from_assignment_id, to_assignment_id::int AS to_assignment_id,
           labels::text[] AS labels
    FROM document_relations
    WHERE from_assignment_id = ${assignmentId}
    ORDER BY id
  `;
}

/** The document-level links among these assignments, by id (none for no assignments). */
export async function documentRelationsAmong(sql: Sql, assignmentIds: readonly number[]) {
  if (!assignmentIds.length) return [];
  const ids = assignmentIds as number[];
  return await sql<{ from: number; to: number; labels: string[] }[]>`
    SELECT from_assignment_id::int AS "from", to_assignment_id::int AS "to", labels::text[] AS labels
    FROM document_relations
    WHERE from_assignment_id IN ${sql(ids)} AND to_assignment_id IN ${sql(ids)}
    ORDER BY id
  `;
}

/** Links made to an assignment, each from "document name (#position)". */
export function documentRelationsToAssignment(sql: Sql, assignmentId: number) {
  return sql<{ from: string; labels: string[] }[]>`
    SELECT d.name || ' (#' || a.seq_pos || ')' AS "from", r.labels::text[] AS labels
    FROM document_relations AS r
    INNER JOIN assignments AS a ON (r.from_assignment_id = a.id)
    INNER JOIN documents AS d ON (a.document_id = d.id)
    WHERE r.to_assignment_id = ${assignmentId}
    ORDER BY a.seq_pos, r.id
  `;
}

/** Every annotator's links from one document of a task, to the target's document name. */
export function documentRelationsFromTaskDocument(sql: Sql, taskId: number, documentId: number) {
  return sql<{ to: string; labels: string[] }[]>`
    SELECT td.name AS "to", r.labels::text[] AS labels
    FROM document_relations AS r
    INNER JOIN assignments AS fa ON (r.from_assignment_id = fa.id)
    INNER JOIN assignments AS ta ON (r.to_assignment_id = ta.id)
    INNER JOIN documents AS td ON (ta.document_id = td.id)
    WHERE fa.task_id = ${taskId} AND fa.document_id = ${documentId}
    ORDER BY r.id
  `;
}

/** Every annotator's links to one document of a task, from the source's document name. */
export function documentRelationsToTaskDocument(sql: Sql, taskId: number, documentId: number) {
  return sql<{ from: string; labels: string[] }[]>`
    SELECT fd.name AS "from", r.labels::text[] AS labels
    FROM document_relations AS r
    INNER JOIN assignments AS fa ON (r.from_assignment_id = fa.id)
    INNER JOIN assignments AS ta ON (r.to_assignment_id = ta.id)
    INNER JOIN documents AS fd ON (fa.document_id = fd.id)
    WHERE ta.task_id = ${taskId} AND ta.document_id = ${documentId}
    ORDER BY r.id
  `;
}
