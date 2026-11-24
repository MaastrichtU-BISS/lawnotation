import type { Sql } from "~/server/db/client";
import type { Project } from "~/types";
import { matching, one, range as rangeOf } from "./helpers";

/** The columns of a project its editor sets. */
export type ProjectFields = { name: string; desc: string };

/** Projects matching the given fields, optionally one [from, to] range of them. */
export function findProjects(sql: Sql, filter: Partial<ProjectFields> = {}, range?: readonly [number, number]) {
  return sql<Project[]>`
    SELECT * FROM projects WHERE true ${matching(sql, filter)} ${rangeOf(sql, range)}
  `;
}

/** The project with this id; throws unless there is exactly one. */
export async function projectById(sql: Sql, id: number) {
  return one(await sql<Project[]>`SELECT * FROM projects WHERE id = ${id}`, "projectById");
}

/** Inserts a project owned by an editor and returns it. */
export async function insertProject(sql: Sql, editorId: string, fields: ProjectFields) {
  const row: Record<string, unknown> = { ...fields, editor_id: editorId };
  return one(
    await sql<Project[]>`INSERT INTO projects ${sql(row, ...Object.keys(row))} RETURNING *`,
    "insertProject"
  );
}

/** Updates the given fields of a project and returns it; throws unless it exists. */
export async function updateProject(sql: Sql, id: number, updates: Partial<ProjectFields>) {
  const values: Record<string, unknown> = updates;
  const columns = Object.keys(values).filter((column) => values[column] !== undefined);
  return one(
    columns.length
      ? await sql<Project[]>`UPDATE projects SET ${sql(values, ...columns)} WHERE id = ${id} RETURNING *`
      : await sql<Project[]>`SELECT * FROM projects WHERE id = ${id}`,
    "updateProject"
  );
}

/** Deletes a project. */
export function deleteProject(sql: Sql, id: number) {
  return sql`DELETE FROM projects WHERE id = ${id}`;
}

/** Deletes every project an editor owns. */
export function deleteProjectsOfEditor(sql: Sql, editorId: string) {
  return sql`DELETE FROM projects WHERE editor_id = ${editorId}`;
}

/** How many projects an editor owns. */
export async function countProjectsOfEditor(sql: Sql, editorId: string) {
  const [{ count }] = await sql<[{ count: number }]>`
    SELECT count(*)::int AS count FROM projects WHERE editor_id = ${editorId}
  `;
  return count;
}

/** Whether a user is the editor of a project. */
export async function isProjectEditor(sql: Sql, projectId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1 from projects where id = ${projectId} and editor_id = ${userId}
    ) as ok`;
  return ok;
}
