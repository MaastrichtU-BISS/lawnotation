import type { Sql } from "~/server/db/client";
import type { Publication } from "~/types";
import { one } from "./helpers";

/** The publication with this id; throws unless there is exactly one. */
export async function publicationById(sql: Sql, id: number) {
  return one(await sql<Publication[]>`SELECT * FROM publications WHERE id = ${id}`, "publicationById");
}

/** Inserts a publication owned by an editor and returns it. */
export async function insertPublication(sql: Sql, editorId: string, fields: Omit<Publication, "id" | "editor_id">) {
  const row: Record<string, unknown> = { ...fields, editor_id: editorId };
  return one(
    await sql<Publication[]>`
      INSERT INTO publications ${sql(row, ...Object.keys(row))}
      RETURNING *
    `,
    "insertPublication"
  );
}

/** Updates the given fields of a publication and returns it; throws unless it exists. */
export async function updatePublication(sql: Sql, id: number, updates: Partial<Publication>) {
  const values: Record<string, unknown> = updates;
  const columns = Object.keys(values).filter((column) => values[column] !== undefined);
  if (!columns.length) return publicationById(sql, id);
  return one(
    await sql<Publication[]>`
      UPDATE publications SET ${sql(values, ...columns)}
      WHERE id = ${id}
      RETURNING *
    `,
    "updatePublication"
  );
}

/** Deletes a publication. */
export function deletePublication(sql: Sql, id: number) {
  return sql`DELETE FROM publications WHERE id = ${id}`;
}

/** Whether a user may see a publication: its editor, or anyone once it is published. */
export async function isPublicationViewer(sql: Sql, publicationId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1 from publications
      where id = ${publicationId}
        and (editor_id = ${userId} or status = 'published')
    ) as ok`;
  return ok;
}

/** Whether a user is the editor of a publication. */
export async function isPublicationEditor(sql: Sql, publicationId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select exists (
      select 1 from publications
      where id = ${publicationId} and editor_id = ${userId}
    ) as ok`;
  return ok;
}
