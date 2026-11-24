import type { PostgrestError } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

type Page<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

/**
 * Every row of a query, fetched a page at a time. PostgREST cuts a single
 * response at the project's max_rows without saying so, which made large
 * tasks export (and score) only their first rows. The query must be ordered
 * so that pages neither overlap nor skip rows.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => Page<T>
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    // An empty page, not a short one, marks the end: max_rows may be smaller
    // than PAGE_SIZE, and then every page comes back short.
    if (!data?.length) return { data: rows, error: null };
    rows.push(...data);
  }
}

const IDS_PER_REQUEST = 200;
const REQUESTS_AT_ONCE = 6;

/**
 * Every row matching a list of ids, asked for a chunk of ids at a time and
 * returned in the order of `ids`. Filtering on an indexed column with
 * `in(column, ids)` takes Postgres straight to the rows; filtering through an
 * embedded `!inner` join instead walks the whole table, which on a large
 * database ran into the statement timeout.
 */
export async function fetchRowsByIds<T>(
  ids: readonly number[],
  page: (ids: number[], from: number, to: number) => Page<T>
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) chunks.push(ids.slice(i, i + IDS_PER_REQUEST));

  const results: T[][] = new Array(chunks.length);
  let error: PostgrestError | null = null;
  let next = 0;
  const worker = async () => {
    while (!error && next < chunks.length) {
      const index = next++;
      const chunk = chunks[index]!;
      const result = await fetchAllRows<T>((from, to) => page(chunk, from, to));
      if (result.error) error ??= result.error;
      results[index] = result.data;
    }
  };
  await Promise.all(Array.from({ length: Math.min(REQUESTS_AT_ONCE, chunks.length) }, worker));
  return { data: error ? [] : results.flat(), error };
}
