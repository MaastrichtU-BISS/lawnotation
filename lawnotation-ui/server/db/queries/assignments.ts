import type { Sql } from "~/server/db/client";
import type { AssignmentStatuses } from "~/utils/enums";

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
