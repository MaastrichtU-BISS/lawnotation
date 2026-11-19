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
