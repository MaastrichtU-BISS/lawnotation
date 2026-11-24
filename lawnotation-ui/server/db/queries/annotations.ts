import type { Sql } from "~/server/db/client";
import type { Annotation } from "~/types";
import type { AssignmentStatuses, Origins } from "~/utils/enums";
import { columnsOf, insertRows, range } from "./helpers";

/** The fields an annotation is created with; the rest keep their defaults. */
export type NewAnnotation = {
  label: string;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  origin?: Origins | null;
  metadata?: string | null;
  confidence_rating?: number;
  kind?: "span" | "document";
};

/**
 * The annotations matching every defined field of `filter` (a null field
 * matches null), within an inclusive row range.
 */
export function findAnnotations(sql: Sql, filter: Partial<NewAnnotation> = {}, rows?: readonly [number, number]) {
  const conditions = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([column, value]) =>
      value === null ? sql`and ${sql(column)} is null` : sql`and ${sql(column)} = ${value as string | number}`
    );
  return sql<Annotation[]>`
    select * from annotations where true ${conditions.length ? conditions : sql``} ${range(sql, rows)}
  `;
}

/** The annotation with this id (no row when there is none). */
export function annotationById(sql: Sql, id: number) {
  return sql<Annotation[]>`select * from annotations where id = ${id}`;
}

/** The annotations of an assignment. */
export function annotationsOfAssignment(sql: Sql, assignmentId: number) {
  return sql<Annotation[]>`select * from annotations where assignment_id = ${assignmentId}`;
}

/**
 * Inserts annotations in chunks and returns their rows in the order given.
 * Run it in a transaction for all-or-nothing.
 */
export function insertAnnotations(sql: Sql, annotations: readonly NewAnnotation[]) {
  return insertRows<Annotation>(sql, "annotations", annotations);
}

/** Sets the given fields of an annotation and returns its row. */
export function updateAnnotation(sql: Sql, id: number, updates: Partial<NewAnnotation>) {
  return sql<Annotation[]>`
    update annotations set ${sql(updates, columnsOf([updates]))}
    where id = ${id}
    returning *
  `;
}

/** Deletes an annotation. */
export function deleteAnnotation(sql: Sql, id: number) {
  return sql`delete from annotations where id = ${id}`;
}

/** Deletes the annotations with these ids. */
export function deleteAnnotations(sql: Sql, ids: readonly number[]) {
  return sql`delete from annotations where id in ${sql(ids)}`;
}

/** The annotations on a document in a task, each with its assignment's task and document. */
export function annotationsOfTaskAndDocument(sql: Sql, taskId: number, documentId: number) {
  return sql<(Annotation & { assignment: { task_id: number; document_id: number } })[]>`
    select an.*,
           json_build_object('task_id', a.task_id, 'document_id', a.document_id) as assignment
    from annotations as an
    join assignments as a on (a.id = an.assignment_id)
    where a.task_id = ${taskId} and a.document_id = ${documentId}
  `;
}

/**
 * The extent, label and text of the annotations with this label on a document
 * in a task by the annotators with these emails, each with its assignment's
 * task, document and annotator email. Nothing when no emails are given.
 */
export async function annotationsOfTaskDocumentLabelAndAnnotators(
  sql: Sql,
  taskId: number,
  documentId: number,
  label: string,
  annotatorEmails: readonly string[]
) {
  type Row = Pick<Annotation, "start_index" | "end_index" | "label" | "text"> & {
    assignment: { task_id: number; document_id: number; annotator: { email: string } };
  };
  if (!annotatorEmails.length) return [] as Row[];
  return await sql<Row[]>`
    select an.start_index, an.end_index, an.label, an.text,
           json_build_object(
             'task_id', a.task_id,
             'document_id', a.document_id,
             'annotator', json_build_object('email', u.email)
           ) as assignment
    from annotations as an
    join assignments as a on (a.id = an.assignment_id)
    join users as u on (u.id = a.annotator_id)
    where a.task_id = ${taskId}
      and a.document_id = ${documentId}
      and an.label = ${label}
      and u.email in ${sql(annotatorEmails)}
  `;
}

/** The annotations of a task by id, each with its assignment's id, task, document and annotator. */
export function annotationsOfTask(sql: Sql, taskId: number) {
  return sql<
    (Annotation & {
      assignment: { id: number; task_id: number; document_id: number; annotator_id: string | null };
    })[]
  >`
    select an.*,
           json_build_object(
             'id', a.id,
             'task_id', a.task_id,
             'document_id', a.document_id,
             'annotator_id', a.annotator_id
           ) as assignment
    from annotations as an
    join assignments as a on (a.id = an.assignment_id)
    where a.task_id = ${taskId}
    order by an.id
  `;
}

/** Whether the user edits the project an annotation is in or annotated its assignment. */
export async function isAnnotationEditorOrAnnotator(sql: Sql, annotationId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from annotations an
      join assignments a on a.id = an.assignment_id
      join tasks t on t.id = a.task_id
      join projects p on p.id = t.project_id
      where an.id = ${annotationId}
        and (p.editor_id = ${userId} or a.annotator_id = ${userId})
    ) as ok`;
  return ok;
}

/* Saving an assignment from legal-annotation-kit (server/utils/annotation_kit.ts) */

/** Id and kind of an assignment's annotations of these kinds. */
export function annotationKindsOfAssignment(sql: Sql, assignmentId: number, kinds: readonly string[]) {
  return sql<{ id: number; kind: string }[]>`
    select id::int as id, kind from annotations
    where assignment_id = ${assignmentId} and kind in ${sql(kinds)}
  `;
}

/** What the kit edits of an annotation. */
export type KitAnnotationFields = {
  start: number;
  end: number;
  text: string;
  label: string;
  metadata: string | null;
  confidence: number;
};

/** Overwrites the extent, text, label, metadata and confidence of an annotation. */
export function updateAnnotationFromKit(sql: Sql, id: number, row: KitAnnotationFields) {
  return sql`
    update annotations
    set start_index = ${row.start}, end_index = ${row.end}, text = ${row.text},
        label = ${row.label}, metadata = ${row.metadata}, confidence_rating = ${row.confidence}
    where id = ${id}
  `;
}

/** Inserts an annotation of an assignment from the kit and returns its id. */
export async function insertAnnotationFromKit(
  sql: Sql,
  assignmentId: number,
  row: KitAnnotationFields & { kind: "span" | "document" },
  origin: Origins
) {
  const [inserted] = await sql<{ id: number }[]>`
    insert into annotations
      (assignment_id, start_index, end_index, text, label, origin, metadata, confidence_rating, kind)
    values
      (${assignmentId}, ${row.start}, ${row.end}, ${row.text}, ${row.label},
       ${origin}::origins, ${row.metadata}, ${row.confidence}, ${row.kind})
    returning id::int as id
  `;
  return inserted!.id;
}

/** Sets an assignment's confidence rating. */
export function setAssignmentConfidence(sql: Sql, assignmentId: number, confidence: number) {
  return sql`update assignments set confidence_rating = ${confidence} where id = ${assignmentId}`;
}

/** Sets an assignment's confidence rating and its status (done, from the kit). */
export function setAssignmentConfidenceAndStatus(
  sql: Sql,
  assignmentId: number,
  confidence: number,
  status: AssignmentStatuses
) {
  return sql`
    update assignments
    set confidence_rating = ${confidence}, status = ${status}::assignment_status
    where id = ${assignmentId}
  `;
}
