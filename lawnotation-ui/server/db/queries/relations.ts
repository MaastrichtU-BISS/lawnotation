import type { Sql } from "~/server/db/client";
import type { AnnotationRelation, RelationDirection } from "~/types";
import { insertRows } from "./helpers";

/** The fields a relation between two annotations is created with. */
export type NewRelation = Pick<AnnotationRelation, "from_id" | "to_id" | "direction" | "labels">;

/** A link from one assignment's document to another's (document-level). */
export type DocumentRelationRow = {
  from_assignment_id: number;
  to_assignment_id: number;
  labels: string[];
};

/* Relations between annotations */

/**
 * Inserts relations in chunks and returns their rows in the order given.
 * Run it in a transaction for all-or-nothing.
 */
export function insertRelations(sql: Sql, relations: readonly NewRelation[]) {
  return insertRows<AnnotationRelation>(sql, "annotation_relations", relations);
}

/** Inserts one relation between two annotations. */
export function insertRelation(
  sql: Sql,
  relation: { from_id: number; to_id: number; direction: RelationDirection; labels: readonly string[] }
) {
  return sql`
    insert into annotation_relations (from_id, to_id, direction, labels)
    values (${relation.from_id}, ${relation.to_id}, ${relation.direction}::relation_directions,
            ${relation.labels as string[]}::text[])
  `;
}

/** The relation with this id (no row when there is none). */
export function relationById(sql: Sql, id: number) {
  return sql<AnnotationRelation[]>`select * from annotation_relations where id = ${id}`;
}

/** The relations of a task, each with the annotation it starts from and that annotation's assignment. */
export function relationsOfTask(sql: Sql, taskId: number) {
  return sql<
    (AnnotationRelation & {
      annotation: { id: number; assignment: { id: number; task_id: number; document_id: number } };
    })[]
  >`
    select r.*,
           json_build_object(
             'id', an.id,
             'assignment', json_build_object('id', a.id, 'task_id', a.task_id, 'document_id', a.document_id)
           ) as annotation
    from annotation_relations as r
    join annotations as an on (an.id = r.from_id)
    join assignments as a on (a.id = an.assignment_id)
    where a.task_id = ${taskId}
  `;
}

/** The relations starting from these annotations. Nothing when no ids are given. */
export async function relationsFromAnnotations(sql: Sql, annotationIds: readonly number[]) {
  if (!annotationIds.length) return [] as AnnotationRelation[];
  return await sql<AnnotationRelation[]>`
    select * from annotation_relations where from_id in ${sql(annotationIds)}
  `;
}

/** Deletes the relations starting or ending at these annotations. */
export function deleteRelationsOfAnnotations(sql: Sql, annotationIds: readonly number[]) {
  return sql`
    delete from annotation_relations
    where from_id in ${sql(annotationIds)} or to_id in ${sql(annotationIds)}
  `;
}

/* Document-level relations between assignments */

/**
 * Links one assignment's document to another's, if both are assignments of
 * this task with the same annotator number and differ; an existing link is
 * kept. Returns how many rows it inserted (0 or 1).
 */
export async function insertDocumentRelationInTask(
  sql: Sql,
  taskId: number,
  relation: DocumentRelationRow
) {
  const inserted = await sql`
    insert into document_relations (from_assignment_id, to_assignment_id, labels)
    select f.id, t.id, ${relation.labels}::text[]
    from assignments as f, assignments as t
    where f.id = ${relation.from_assignment_id} and t.id = ${relation.to_assignment_id}
      and f.id <> t.id
      and f.task_id = ${taskId} and t.task_id = ${taskId}
      and f.annotator_number = t.annotator_number
    on conflict (from_assignment_id, to_assignment_id) do nothing
  `;
  return inserted.count;
}

/** The other assignments in the same annotator's queue for the assignment's task: what it may link to. */
export async function linkableAssignmentIds(sql: Sql, assignmentId: number) {
  const rows = await sql<{ id: number }[]>`
    select other.id::int as id
    from assignments as self
    inner join assignments as other
      on (other.task_id = self.task_id and other.annotator_number = self.annotator_number)
    where self.id = ${assignmentId} and other.id <> self.id
  `;
  return rows.map((r) => r.id);
}

/** The document-level links from these assignments. */
export function documentRelationsFrom(sql: Sql, assignmentIds: readonly number[]) {
  return sql<DocumentRelationRow[]>`
    select from_assignment_id::int as from_assignment_id, to_assignment_id::int as to_assignment_id,
           labels::text[] as labels
    from document_relations
    where from_assignment_id in ${sql(assignmentIds)}
  `;
}

/** Deletes the document-level links from an assignment. */
export function deleteDocumentRelationsFrom(sql: Sql, assignmentId: number) {
  return sql`delete from document_relations where from_assignment_id = ${assignmentId}`;
}

/**
 * Links one assignment's document to another's. An existing link between the
 * two gets these labels with `onConflict: "update"`, or is kept with "keep".
 */
export function upsertDocumentRelation(
  sql: Sql,
  relation: DocumentRelationRow,
  { onConflict }: { onConflict: "update" | "keep" }
) {
  return sql`
    insert into document_relations (from_assignment_id, to_assignment_id, labels)
    values (${relation.from_assignment_id}, ${relation.to_assignment_id}, ${relation.labels}::text[])
    on conflict (from_assignment_id, to_assignment_id)
      ${onConflict === "update" ? sql`do update set labels = excluded.labels` : sql`do nothing`}
  `;
}
