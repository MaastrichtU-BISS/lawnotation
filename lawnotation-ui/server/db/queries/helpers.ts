import type { Sql } from "~/server/db/client";

/** The single row a query must return, or an error naming the query. */
export function one<T>(rows: readonly T[], what: string): T {
  if (rows.length !== 1) throw new Error(`${what}: expected one row, got ${rows.length}`);
  return rows[0]!;
}

/** `and column = value` for each defined field (as PostgREST's match() did), or nothing. */
export function matching(sql: Sql, fields: Record<string, unknown>) {
  const matches = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([column, value]) => sql`and ${sql(column)} = ${value as string}`);
  return matches.length ? matches : sql``;
}

/** `limit … offset …` for an inclusive [from, to] range, or nothing. */
export function range(sql: Sql, r?: readonly [number, number]) {
  return r ? sql`limit ${Math.max(r[1] - r[0] + 1, 0)} offset ${r[0]}` : sql``;
}

/**
 * The columns an insert of these rows sets: every field any row defines. A
 * field no row has keeps its column default; one only some rows have is null
 * on the others.
 */
export function columnsOf<T extends object>(rows: readonly T[]): (keyof T & string)[] {
  const columns = new Set<string>();
  for (const row of rows)
    for (const [column, value] of Object.entries(row)) if (value !== undefined) columns.add(column);
  return [...columns] as (keyof T & string)[];
}

// postgres.js allows at most 65534 parameters in one statement.
const INSERT_CHUNK_SIZE = 1000;

/** Inserts any number of rows in chunks and returns the inserted rows in the order given. */
export async function insertRows<R = any>(sql: Sql, table: string, rows: readonly object[]): Promise<R[]> {
  if (!rows.length) return [];
  const columns = columnsOf(rows) as string[];
  const inserted: R[] = [];
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE) as Record<string, any>[];
    inserted.push(...((await sql`insert into ${sql(table)} ${sql(chunk, columns)} returning *`) as unknown as R[]));
  }
  return inserted;
}
