import type { Sql } from "~/server/db/client";
import type { Task } from "~/types";

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
