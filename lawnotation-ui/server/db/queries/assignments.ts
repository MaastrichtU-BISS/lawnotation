import type { Sql } from "~/server/db/client";
import type { Assignment } from "~/types";
import type { AssignmentStatuses, Direction, Origins } from "~/utils/enums";
import { columnsOf, insertRows } from "./helpers";

/** How many assignments there are in the projects an editor owns. */
export async function countAssignmentsOfEditor(sql: Sql, editorId: string) {
  const [row] = await sql<[{ count: number }]>`
    select count(*)::int as count
    from assignments as a
    inner join tasks as t on (a.task_id = t.id)
    inner join projects as p on (t.project_id = p.id)
    where p.editor_id = ${editorId}
  `;
  return row.count;
}

/** Assignments per confidence rating in the projects an editor owns. */
export function confidencesOfEditor(sql: Sql, editorId: string) {
  return sql<{ confidence: number; count: number }[]>`
    select a.confidence_rating::int as confidence, count(a.confidence_rating)::int as count
    from assignments as a
    inner join tasks as t on (t.id = a.task_id)
    inner join projects as p on (t.project_id = p.id)
    where p.editor_id = ${editorId}
    group by a.confidence_rating
    order by a.confidence_rating
  `;
}

/** Assignments per status in the projects an editor owns. */
export function completionOfEditor(sql: Sql, editorId: string) {
  return sql<{ status: AssignmentStatuses; count: number }[]>`
    select a.status, count(a.status)::int as count
    from assignments as a
    inner join tasks as t on (t.id = a.task_id)
    inner join projects as p on (t.project_id = p.id)
    where p.editor_id = ${editorId}
    group by a.status
    order by a.status desc
  `;
}

/** An annotator's assignments per status. */
export function completionOfAnnotator(sql: Sql, annotatorId: string) {
  return sql<{ status: AssignmentStatuses; count: number }[]>`
    select a.status, count(a.status)::int as count
    from assignments as a
    where a.annotator_id = ${annotatorId}
    group by a.status
    order by a.status desc
  `;
}

// Statuses an annotator still has to work on.
const UNFINISHED = ["pending", "pre-annotated", "failed"] satisfies `${AssignmentStatuses}`[];

/** The columns of an assignment a caller may set; unset ones keep their default. */
export type AssignmentFields = {
  annotator_id?: string | null;
  task_id?: number;
  document_id?: number;
  status?: AssignmentStatuses;
  seq_pos?: number;
  confidence_rating?: number;
  annotator_number?: number;
  origin?: Origins;
  original_task_id?: number | null;
};

// --- access checks (authorizers) ---

/** Whether the user edits the project the assignment's task belongs to. */
export async function isEditorOfAssignment(sql: Sql, assignmentId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from assignments a
      join tasks t on t.id = a.task_id
      join projects p on p.id = t.project_id
      where a.id = ${assignmentId} and p.editor_id = ${userId}
    ) as ok`;
  return ok;
}

/** Whether the user edits the assignment's project or is its annotator. */
export async function isEditorOrAnnotatorOfAssignment(sql: Sql, assignmentId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from assignments a
      join tasks t on t.id = a.task_id
      join projects p on p.id = t.project_id
      where a.id = ${assignmentId}
        and (p.editor_id = ${userId} or a.annotator_id = ${userId})
    ) as ok`;
  return ok;
}

/**
 * Whether every one of these distinct assignments exists (with a task in a
 * project) and is annotated by the user or in a project the user edits; one
 * query for any number of ids.
 */
export async function isEditorOrAnnotatorOfAssignments(sql: Sql, assignmentIds: number[], userId: string) {
  const ids = [...new Set(assignmentIds)];
  if (!ids.length) return true;
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select count(*) = ${ids.length} as ok
    from assignments a
    join tasks t on t.id = a.task_id
    join projects p on p.id = t.project_id
    where a.id = any(${ids}::bigint[])
      and (a.annotator_id = ${userId} or p.editor_id = ${userId})`;
  return ok;
}

// --- users invited to a task ---

/**
 * Finds the user with this email (case-insensitively) or creates their row,
 * recording the task as `assigned_task_id` in its metadata, in one statement so
 * two invitations of the same address can't collide. `created` is true only
 * for a freshly inserted row (xmax = 0).
 */
export async function upsertAssignedUser(sql: Sql, email: string, taskId: number) {
  const [row] = await sql<[{ id: string; email: string; created: boolean }]>`
    insert into users (email, metadata)
    values (lower(${email}), jsonb_build_object('assigned_task_id', ${taskId}::bigint))
    on conflict ((lower(email))) do update
      set metadata = users.metadata || jsonb_build_object('assigned_task_id', ${taskId}::bigint)
    returning id, email, (xmax = 0) as created
  `;
  return row;
}

/** Creates the user's row if missing and records the task as `invited_task_id` in its metadata. */
export function upsertInvitedUser(sql: Sql, email: string, taskId: number) {
  return sql`
    insert into users (email, metadata)
    values (lower(${email}), jsonb_build_object('invited_task_id', ${taskId}::bigint))
    on conflict ((lower(email))) do update
      set metadata = users.metadata || jsonb_build_object('invited_task_id', ${taskId}::bigint)
  `;
}

// --- writes ---

/** Inserts one assignment and returns it. */
export async function insertAssignment(sql: Sql, fields: AssignmentFields) {
  const columns = columnsOf([fields]);
  const [row] = await sql<Assignment[]>`
    insert into assignments ${sql(fields, ...columns)}
    returning *
  `;
  return row;
}

/**
 * Inserts assignments in chunks and returns them in the order given; the
 * columns are those any row sets (null on the others). Run it in a
 * transaction to keep it all-or-nothing.
 */
export function insertAssignments(sql: Sql, rows: readonly AssignmentFields[]) {
  return insertRows<Assignment>(sql, "assignments", rows);
}

/** Updates an assignment's set fields and returns its rows; with nothing to set, just reads it. */
export function updateAssignment(sql: Sql, id: number, updates: AssignmentFields) {
  const columns = columnsOf([updates]);
  return columns.length
    ? sql<Assignment[]>`
        update assignments set ${sql(updates, ...columns)}
        where id = ${id}
        returning *
      `
    : sql<Assignment[]>`select * from assignments where id = ${id}`;
}

/** Deletes one assignment. */
export function deleteAssignment(sql: Sql, id: number) {
  return sql`delete from assignments where id = ${id}`;
}

/** Deletes every assignment of a task. */
export function deleteAssignmentsOfTask(sql: Sql, taskId: number) {
  return sql`delete from assignments where task_id = ${taskId}`;
}

/** Deletes every assignment of the given annotator numbers in a task; returns how many. */
export async function deleteAssignmentsOfAnnotators(sql: Sql, taskId: number, annotatorNumbers: number[]) {
  const deleted = await sql`
    delete from assignments
    where task_id = ${taskId} and annotator_number in ${sql(annotatorNumbers)}
  `;
  return deleted.count;
}

// --- reads ---

/** An assignment (zero or one row) with its annotator's id and email, or null for none. */
export function assignmentWithAnnotator(sql: Sql, id: number) {
  return sql<(Assignment & { annotator: { id: string; email: string } | null })[]>`
    select a.*,
           case when u.id is null then null
                else json_build_object('id', u.id, 'email', u.email) end as annotator
    from assignments as a
    left join users as u on (a.annotator_id = u.id)
    where a.id = ${id}
  `;
}

/** A task's assignments, by id. */
export function assignmentsOfTask(sql: Sql, taskId: number) {
  return sql<Assignment[]>`select * from assignments where task_id = ${taskId} order by id`;
}

/** A task's assignments, each with its document's hash (as `documents`). */
export function assignmentsWithDocumentHashOfTask(sql: Sql, taskId: number) {
  return sql<(Assignment & { documents: { hash: string | null } | null })[]>`
    select a.*,
           case when d.id is null then null
                else json_build_object('hash', d.hash) end as documents
    from assignments as a
    left join documents as d on (a.document_id = d.id)
    where a.task_id = ${taskId}
  `;
}

/**
 * A task's assignments by id, narrowed to an annotator id and/or number when
 * given (a falsy value, such as annotator number 0, doesn't narrow).
 */
export function assignmentsOfTaskAndAnnotator(
  sql: Sql,
  taskId: number,
  annotator: { annotatorId?: string; annotatorNumber?: number }
) {
  const byAnnotatorId = annotator.annotatorId ? sql`and annotator_id = ${annotator.annotatorId}` : sql``;
  const byAnnotatorNumber = annotator.annotatorNumber
    ? sql`and annotator_number = ${annotator.annotatorNumber}`
    : sql``;
  return sql<Assignment[]>`
    select * from assignments
    where task_id = ${taskId} ${byAnnotatorId} ${byAnnotatorNumber}
    order by id
  `;
}

/** An annotator's first assignment in a task, by queue position, that isn't done; or null. */
export async function nextAssignmentOfAnnotatorInTask(sql: Sql, annotatorId: string, taskId: number) {
  const [row] = await sql<Assignment[]>`
    select * from assignments
    where annotator_id = ${annotatorId}
      and task_id = ${taskId}
      and status <> 'done'
    order by seq_pos
    limit 1
  `;
  return row ?? null;
}

/**
 * An annotator's assignments in a task relative to a queue position: the one
 * just before it, those at it, or the one just after it.
 */
export function assignmentsOfAnnotatorAtPosition(
  sql: Sql,
  annotatorId: string,
  taskId: number,
  seqPos: number,
  dir: `${Direction}`
) {
  let seqFilter;
  switch (dir) {
    case "previous":
      seqFilter = sql`and seq_pos < ${seqPos} order by seq_pos desc limit 1`;
      break;
    case "current":
      seqFilter = sql`and seq_pos = ${seqPos}`;
      break;
    case "next":
      seqFilter = sql`and seq_pos > ${seqPos} order by seq_pos asc limit 1`;
      break;
    default:
      throw new Error("Direction value was not provided");
  }
  return sql<Assignment[]>`
    select * from assignments
    where task_id = ${taskId}
      and annotator_id = ${annotatorId}
      ${seqFilter}
  `;
}

/** All of an annotator's assignments. */
export function assignmentsOfAnnotator(sql: Sql, annotatorId: string) {
  return sql<Assignment[]>`select * from assignments where annotator_id = ${annotatorId}`;
}

/** An annotator's next unfinished assignment: newest task first, then queue position; or null. */
export async function nextAssignmentOfAnnotator(sql: Sql, annotatorId: string) {
  const [row] = await sql<Assignment[]>`
    select * from assignments
    where annotator_id = ${annotatorId}
      and status::text in ${sql(UNFINISHED)}
    order by task_id desc, seq_pos asc
    limit 1
  `;
  return row ?? null;
}

/** How many assignments a project's tasks have. */
export async function countAssignmentsOfProject(sql: Sql, projectId: number) {
  const [row] = await sql<[{ count: number }]>`
    select count(*)::int as count
    from assignments as a
    inner join tasks as t on (a.task_id = t.id)
    where t.project_id = ${projectId}
  `;
  return row.count;
}

/** How many assignments a task has. */
export async function countAssignmentsOfTask(sql: Sql, taskId: number) {
  const [row] = await sql<[{ count: number }]>`
    select count(*)::int as count from assignments where task_id = ${taskId}
  `;
  return row.count;
}

/** How many of a task's assignments are waiting for a model prediction. */
export async function countPredictingAssignmentsOfTask(sql: Sql, taskId: number) {
  const [row] = await sql<[{ count: number }]>`
    select count(*)::int as count from assignments
    where task_id = ${taskId} and status = 'predicting'
  `;
  return row.count;
}

/**
 * An annotator's assignments in a task: how many in total, and how many
 * before the given position (or, without one, how many are done).
 */
export async function progressOfAnnotatorInTask(sql: Sql, annotatorId: string, taskId: number, seqPos: number) {
  const previous = seqPos > 0 ? sql`seq_pos < ${seqPos}` : sql`status = 'done'`;
  const [row] = await sql<[{ total: number; previous: number }]>`
    select count(*)::int as total,
           (count(*) filter (where ${previous}))::int as previous
    from assignments
    where annotator_id = ${annotatorId} and task_id = ${taskId}
  `;
  return row;
}

/**
 * One page of a task's annotators (by annotator number) with their progress,
 * optionally only those whose email (or "annotator N") contains `name`; each
 * row carries the total number of matching annotators.
 */
export function annotatorProgressOfTask(
  sql: Sql,
  taskId: number,
  name: string,
  page: { limit: number; offset: number }
) {
  const annotatorName = sql.unsafe("COALESCE(MAX(u.email), CONCAT('annotator ', a.annotator_number))");
  const nameFilter = name ? sql`having ${annotatorName} ilike ${"%" + name + "%"}` : sql``;
  return sql<
    {
      annotator_number: number;
      name: string;
      amount_done: number;
      amount_total: number;
      next_seq_pos: number | null;
      total_annotators: number;
    }[]
  >`
    select a.annotator_number::int as annotator_number,
           ${annotatorName} as name,
           (count(*) filter (where a.status = 'done'::assignment_status))::int as amount_done,
           count(*)::int as amount_total,
           (min(a.seq_pos) filter (where a.status::text in ${sql(UNFINISHED)}))::int as next_seq_pos,
           (count(*) over ())::int as total_annotators
    from assignments as a
    left join users as u on (a.annotator_id = u.id)
    where a.task_id = ${taskId}
    group by a.annotator_number
    ${nameFilter}
    order by a.annotator_number
    limit ${page.limit} offset ${page.offset}
  `;
}

/** How many distinct annotator numbers a task has. */
export async function countAnnotatorsOfTask(sql: Sql, taskId: number) {
  const rows = await sql`select distinct annotator_number from assignments where task_id = ${taskId}`;
  return rows.count;
}

/**
 * One page of an annotator's assignments in a task, in queue order, with
 * document name and annotator name; each row carries the annotator's total.
 */
export function documentsOfAnnotatorInTask(
  sql: Sql,
  taskId: number,
  annotatorNumber: number,
  page: { limit: number; offset: number }
) {
  return sql<
    {
      id: number;
      seq_pos: number;
      document_id: number;
      document_name: string;
      annotator_name: string;
      confidence_rating: number;
      status: string;
      total: number;
    }[]
  >`
    select a.id::int as id, a.seq_pos::int as seq_pos, a.document_id::int as document_id,
           d.name as document_name,
           coalesce(u.email, concat('annotator ', a.annotator_number)) as annotator_name,
           a.confidence_rating::int as confidence_rating, a.status::text as status,
           (count(*) over ())::int as total
    from assignments as a
    inner join documents as d on (a.document_id = d.id)
    left join users as u on (a.annotator_id = u.id)
    where a.task_id = ${taskId} and a.annotator_number = ${annotatorNumber}
    order by a.seq_pos, a.id
    limit ${page.limit} offset ${page.offset}
  `;
}

/** A document with its assignments in a task (queue order) and the total of matching documents. */
export type DocumentWithAssignmentsRow = {
  id: number;
  name: string;
  assignments: {
    id: number;
    task_id: number;
    seq_pos: number | null;
    annotator_number: number;
    status: AssignmentStatuses;
    confidence_rating: number;
    user: { id: string; email: string } | null;
  }[];
  total: number;
};

const documentNameFilter = (sql: Sql, name: string) =>
  name.length ? sql`and d.name ilike ${`%${name}%`}` : sql``;

/**
 * One page of the documents with at least one assignment in a task, by id,
 * optionally only those whose name contains `name`.
 */
export function documentsWithAssignmentsOfTask(
  sql: Sql,
  taskId: number,
  name: string,
  page: { limit: number; offset: number }
) {
  return sql<DocumentWithAssignmentsRow[]>`
    select d.id, d.name,
           json_agg(
             json_build_object(
               'id', a.id,
               'task_id', a.task_id,
               'seq_pos', a.seq_pos,
               'annotator_number', a.annotator_number,
               'status', a.status,
               'confidence_rating', a.confidence_rating,
               'user', case when u.id is null then null
                            else json_build_object('id', u.id, 'email', u.email) end
             )
             order by a.seq_pos
           ) as assignments,
           (count(*) over ())::int as total
    from documents as d
    inner join assignments as a on (a.document_id = d.id and a.task_id = ${taskId})
    left join users as u on (a.annotator_id = u.id)
    where true ${documentNameFilter(sql, name)}
    group by d.id
    order by d.id
    limit ${page.limit} offset ${page.offset}
  `;
}

/** How many documents have at least one assignment in a task, optionally only those whose name contains `name`. */
export async function countDocumentsWithAssignmentsOfTask(sql: Sql, taskId: number, name: string) {
  const [row] = await sql<[{ count: number }]>`
    select count(distinct d.id)::int as count
    from documents as d
    inner join assignments as a on (a.document_id = d.id and a.task_id = ${taskId})
    where true ${documentNameFilter(sql, name)}
  `;
  return row.count;
}
