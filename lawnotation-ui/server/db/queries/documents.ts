import type { Sql } from "~/server/db/client";
import type { Document } from "~/types";

/** The documents a task has assignments on, by id. */
export function documentsOfTask(sql: Sql, taskId: number) {
  return sql<Document[]>`
    select d.*
    from documents as d
    where d.id in (select a.document_id from assignments as a where a.task_id = ${taskId})
    order by d.id
  `;
}

/** Id and content hash of the documents a task has assignments on, by id. */
export function documentHashesOfTask(sql: Sql, taskId: number) {
  return sql<{ id: number; hash: string }[]>`
    select d.id, d.hash
    from documents as d
    where d.id in (select a.document_id from assignments as a where a.task_id = ${taskId})
    order by d.id
  `;
}

/**
 * The documents of a task that more than one assignment points at (so more
 * than one annotator saw them), by id. With `acrossOriginTasks`, only those
 * whose assignments come from more than one original task (a task merged from
 * two others).
 */
export function sharedDocumentsOfTask(sql: Sql, taskId: number, { acrossOriginTasks = false } = {}) {
  return sql<Document[]>`
    select d.*
    from documents as d
    inner join assignments as a on (a.document_id = d.id)
    where a.task_id = ${taskId}
    group by d.id
    having count(*) > 1
      ${acrossOriginTasks ? sql`and count(distinct a.original_task_id) > 1` : sql``}
    order by d.id
  `;
}

/** Up to `n` ids of documents in a project, in random order. */
export async function randomDocumentIds(sql: Sql, projectId: number, n: number) {
  const rows = await sql<{ id: number }[]>`
    select id from documents where project_id = ${projectId} order by random() limit ${n}
  `;
  return rows.map((r) => r.id);
}
