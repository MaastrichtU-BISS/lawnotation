import type { Sql } from "~/server/db/client";

// The reads a task export (and the IAA metrics built from it) is made of.
// Each one starts from the task's own rows and reaches the rest through
// indexed ids, so its cost follows the size of the task.

/** The fields of a task an export needs (no row when there is none). */
export function taskForExport(sql: Sql, taskId: number) {
  return sql<
    {
      name: string | null;
      desc: string | null;
      ann_guidelines: string | null;
      annotation_level: string | null;
      labelset_id: number | null;
      document_labelset_id: number | null;
    }[]
  >`
    SELECT name, "desc", ann_guidelines, annotation_level, labelset_id, document_labelset_id
    FROM tasks WHERE id = ${taskId}
  `;
}

/** The fields of a labelset an export needs (no row when there is none). */
export function labelsetForExport(sql: Sql, labelsetId: number | null) {
  return sql<{ name: string | null; desc: string | null; labels: unknown; relation_labels: string[] | null }[]>`
    SELECT name, "desc", labels, relation_labels FROM labelsets WHERE id = ${labelsetId}
  `;
}

/** A task's assignments with their annotator's email, by id; assignments with no annotator are left out. */
export function assignmentsWithEmailOfTask(sql: Sql, taskId: number) {
  return sql<
    {
      id: number;
      document_id: number | null;
      annotator_id: string | null;
      seq_pos: number | null;
      status: string | null;
      confidence_rating: number | null;
      email: string | null;
    }[]
  >`
    SELECT a.id, a.document_id, a.annotator_id, a.seq_pos, a.status, a.confidence_rating, u.email
    FROM assignments AS a
    INNER JOIN users AS u ON (u.id = a.annotator_id)
    WHERE a.task_id = ${taskId}
    ORDER BY a.id
  `;
}

/** The annotations (spans and document tags) of these assignments, by id. */
export function annotationsOfAssignments(sql: Sql, assignmentIds: readonly number[]) {
  // One array parameter carries any number of ids.
  return sql<
    {
      id: number;
      assignment_id: number | null;
      start_index: number | null;
      end_index: number | null;
      label: string | null;
      text: string | null;
      confidence_rating: number;
      metadata: string | null;
      kind: string;
    }[]
  >`
    SELECT id, assignment_id, start_index, end_index, label, text, confidence_rating, metadata, kind
    FROM annotations
    WHERE assignment_id = ANY(${assignmentIds as number[]}::bigint[])
    ORDER BY id
  `;
}

/** The document-level links made from these assignments, by id. */
export function documentRelationsFromAssignments(sql: Sql, assignmentIds: readonly number[]) {
  return sql<{ from_assignment_id: number; to_assignment_id: number; labels: string[] | null }[]>`
    SELECT from_assignment_id, to_assignment_id, labels
    FROM document_relations
    WHERE from_assignment_id = ANY(${assignmentIds as number[]}::bigint[])
    ORDER BY id
  `;
}

/** The links that start at these annotations, by id. */
export function exportRelationsFromAnnotations(sql: Sql, annotationIds: readonly number[]) {
  return sql<{ from_id: number | null; to_id: number | null; direction: string | null; labels: string[] | null }[]>`
    SELECT from_id, to_id, direction, labels
    FROM annotation_relations
    WHERE from_id = ANY(${annotationIds as number[]}::bigint[])
    ORDER BY id
  `;
}
