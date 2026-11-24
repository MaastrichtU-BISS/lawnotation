import type { Sql } from "~/server/db/client";
import type { Task } from "~/types";
import { columnsOf, matching, range } from "./helpers";

/**
 * A task's annotators, one row per annotator number, ordered by it; id, email
 * and role are null for an annotator number with no user linked to it.
 */
export function annotatorsOfTask(sql: Sql, taskId: number) {
  return sql<{ id: string | null; email: string | null; role: string | null; annotator_number: number }[]>`
    select u.id, u.email, u.role, a.annotator_number::int as annotator_number
    from assignments as a
    left join users as u on (a.annotator_id = u.id)
    where a.task_id = ${taskId}
    group by u.id, a.annotator_number
    order by annotator_number
  `;
}

/** The tasks an annotator has at least one assignment in. */
export function tasksOfAnnotator(sql: Sql, annotatorId: string) {
  return sql<Task[]>`
    select t.*
    from tasks as t
    where t.id in (select a.task_id from assignments as a where a.annotator_id = ${annotatorId})
  `;
}

/** How many tasks there are in the projects an editor owns. */
export async function countTasksOfEditor(sql: Sql, editorId: string) {
  const [row] = await sql<[{ count: number }]>`
    select count(*)::int as count
    from tasks as t
    inner join projects as p on (t.project_id = p.id)
    where p.editor_id = ${editorId}
  `;
  return row.count;
}

/** The tasks matching every defined field of `filter`, within an optional inclusive [from, to] range. */
export function findTasks(sql: Sql, filter: Record<string, unknown> = {}, r?: readonly [number, number]) {
  return sql<Task[]>`select * from tasks where true ${matching(sql, filter)} ${range(sql, r)}`;
}

/** The task with this id (no row when there is none). */
export function taskById(sql: Sql, id: number) {
  return sql<Task[]>`select * from tasks where id = ${id}`;
}

/** The columns of a task an insert or update sets (optional ones may be null). */
export type TaskFields = { [K in Exclude<keyof Task, "id">]?: Task[K] | null };

/** Inserts a task and returns it. */
export async function insertTask(sql: Sql, fields: TaskFields) {
  const [task] = await sql<Task[]>`insert into tasks ${sql(fields)} returning *`;
  return task as Task;
}

/**
 * Sets the defined fields of `updates` on a task and returns the task (no row
 * when there is none); with no defined field it only reads the task.
 */
export function updateTask(sql: Sql, id: number, updates: TaskFields) {
  const columns = columnsOf([updates]);
  return columns.length
    ? sql<Task[]>`update tasks set ${sql(updates, columns)} where id = ${id} returning *`
    : taskById(sql, id);
}

/** Deletes a task. */
export function deleteTask(sql: Sql, id: number) {
  return sql`delete from tasks where id = ${id}`;
}

/** Deletes every task of a project. */
export function deleteTasksOfProject(sql: Sql, projectId: number) {
  return sql`delete from tasks where project_id = ${projectId}`;
}

/** How many tasks use a labelset, as span or document labelset. */
export async function countTasksOfLabelset(sql: Sql, labelsetId: number) {
  const [row] = await sql<[{ count: number }]>`
    select count(*)::int as count from tasks
    where labelset_id = ${labelsetId} or document_labelset_id = ${labelsetId}
  `;
  return row.count;
}

/** Whether the user is the editor of the project a task belongs to. */
export async function isTaskEditor(sql: Sql, taskId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from tasks t
      join projects p on p.id = t.project_id
      where t.id = ${taskId} and p.editor_id = ${userId}
    ) as ok`;
  return ok;
}

/** Whether the user is an annotator of a task (has an assignment in it). */
export async function isTaskAnnotator(sql: Sql, taskId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1 from assignments
      where task_id = ${taskId} and annotator_id = ${userId}
    ) as ok`;
  return ok;
}

/** A task with its labels and its document labels, each null when the task has no such labelset. */
export type TaskWithLabels = {
  id: number;
  name: string | null;
  annotation_level: string;
  labelsets: { labels: unknown } | null;
  document_labelsets: { labels: unknown } | null;
};

const taskWithLabels = (sql: Sql) => sql`
  select t.id, t.name, t.annotation_level,
         case when l.id is null then null else json_build_object('labels', l.labels) end as labelsets,
         case when dl.id is null then null else json_build_object('labels', dl.labels) end as document_labelsets
  from tasks as t
  left join labelsets as l on (l.id = t.labelset_id)
  left join labelsets as dl on (dl.id = t.document_labelset_id)
`;

/** The task with this id and its labels (no row when there is none). */
export function taskWithLabelsById(sql: Sql, taskId: number) {
  return sql<TaskWithLabels[]>`${taskWithLabels(sql)} where t.id = ${taskId}`;
}

/**
 * The other tasks, with their labels, in the projects an editor owns that
 * have this annotation level, by project and id.
 */
export function otherTasksWithLabelsOfEditor(sql: Sql, editorId: string, exceptTaskId: number, annotationLevel: string) {
  return sql<TaskWithLabels[]>`
    ${taskWithLabels(sql)}
    inner join projects as p on (p.id = t.project_id)
    where p.editor_id = ${editorId}
      and t.id <> ${exceptTaskId}
      and t.annotation_level = ${annotationLevel}
    order by p.id, t.id
  `;
}

