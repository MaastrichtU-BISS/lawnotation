import type { Sql } from "~/server/db/client";
import type { Label, Labelset } from "~/types";
import { one, range as rangeOf } from "./helpers";

/** The columns of a labelset its editor sets. */
export type LabelsetFields = {
  name: string;
  desc: string;
  labels: Label[];
  relation_labels?: string[] | null;
};

// labels is a jsonb column: an array must reach it as JSON, not as a
// Postgres array.
function columnValues(sql: Sql, fields: Partial<LabelsetFields>) {
  const values: Record<string, unknown> = { ...fields };
  if (fields.labels) values.labels = sql.json(fields.labels as any);
  return values;
}

/** An editor's labelsets matching the given fields (null matches NULL), optionally one [from, to] range of them. */
export function labelsetsOfEditor(
  sql: Sql,
  editorId: string,
  filter: Partial<LabelsetFields> = {},
  range?: readonly [number, number]
) {
  const matches = Object.entries(columnValues(sql, filter))
    .filter(([, value]) => value !== undefined)
    .map(([column, value]) =>
      value === null ? sql`AND ${sql(column)} IS NULL` : sql`AND ${sql(column)} = ${value as any}`
    );
  return sql<Labelset[]>`
    SELECT * FROM labelsets
    WHERE editor_id = ${editorId} ${matches.length ? matches : sql``}
    ${rangeOf(sql, range)}
  `;
}

/** The labelset with this id; throws unless there is exactly one. */
export async function labelsetById(sql: Sql, id: number) {
  return one(await sql<Labelset[]>`SELECT * FROM labelsets WHERE id = ${id}`, "labelsetById");
}

/** Inserts a labelset owned by an editor and returns it. */
export async function insertLabelset(sql: Sql, editorId: string, fields: LabelsetFields) {
  const row: Record<string, unknown> = { ...columnValues(sql, fields), editor_id: editorId };
  return one(
    await sql<Labelset[]>`
      INSERT INTO labelsets ${sql(row, ...Object.keys(row))}
      RETURNING *
    `,
    "insertLabelset"
  );
}

/** The editable fields of an editor's labelset, or undefined if it isn't theirs. */
export async function labelsetFieldsOfEditor(sql: Sql, id: number, editorId: string) {
  const [row] = await sql<LabelsetFields[]>`
    SELECT name, "desc", labels, relation_labels FROM labelsets
    WHERE id = ${id} AND editor_id = ${editorId}
  `;
  return row;
}

/** How many tasks use a labelset, as their labelset or document labelset. */
export async function countTasksUsingLabelset(sql: Sql, labelsetId: number) {
  const [{ count }] = await sql<[{ count: number }]>`
    SELECT count(*)::int AS count FROM tasks
    WHERE labelset_id = ${labelsetId} OR document_labelset_id = ${labelsetId}
  `;
  return count;
}

/** Updates the given fields of an editor's labelset and returns it; throws unless it is theirs. */
export async function updateLabelsetOfEditor(
  sql: Sql,
  id: number,
  editorId: string,
  updates: Partial<LabelsetFields>
) {
  const values = columnValues(sql, updates);
  const columns = Object.keys(values).filter((column) => values[column] !== undefined);
  return one(
    columns.length
      ? await sql<Labelset[]>`
          UPDATE labelsets SET ${sql(values, ...columns)}
          WHERE id = ${id} AND editor_id = ${editorId}
          RETURNING *
        `
      : await sql<Labelset[]>`
          SELECT * FROM labelsets WHERE id = ${id} AND editor_id = ${editorId}
        `,
    "updateLabelsetOfEditor"
  );
}

/** Deletes an editor's labelset (nothing if it isn't theirs). */
export function deleteLabelsetOfEditor(sql: Sql, id: number, editorId: string) {
  return sql`DELETE FROM labelsets WHERE id = ${id} AND editor_id = ${editorId}`;
}

/**
 * Whether a user may see a labelset: its editor, anyone for a labelset without
 * an editor, or an annotator of a task that uses it (as its labelset or, for a
 * hybrid task, its document labelset).
 */
export async function labelsetVisibleTo(sql: Sql, labelsetId: number, userId: string) {
  const [{ ok }] = await sql<[{ ok: boolean }]>`
    select
      exists (
        select 1 from labelsets
        where id = ${labelsetId}
          and (editor_id = ${userId} or editor_id is null)
      )
      or exists (
        select 1
        from tasks t
        join assignments a on a.task_id = t.id
        where (t.labelset_id = ${labelsetId} or t.document_labelset_id = ${labelsetId})
          and a.annotator_id = ${userId}
      ) as ok`;
  return ok;
}
