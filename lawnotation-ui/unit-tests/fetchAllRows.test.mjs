// pnpm test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAllRows } from "../server/utils/fetch_all_rows.ts";

// A table behind a PostgREST that answers at most `maxRows` rows per request.
const table = (size, maxRows) => {
  const rows = Array.from({ length: size }, (_, id) => ({ id }));
  const requests = [];
  const page = async (from, to) => {
    requests.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + maxRows)), error: null };
  };
  return { rows, requests, page };
};

test("rows past the server's cap are fetched, not dropped", async () => {
  const { rows, page } = table(12_345, 10_000);
  const { data, error } = await fetchAllRows(page);
  assert.equal(error, null);
  assert.deepEqual(data, rows);
});

test("a cap below the page size still yields every row", async () => {
  const { rows, page } = table(2_500, 400);
  assert.deepEqual((await fetchAllRows(page)).data, rows);
});

test("an empty table takes one request", async () => {
  const { requests, page } = table(0, 10_000);
  assert.deepEqual((await fetchAllRows(page)).data, []);
  assert.equal(requests.length, 1);
});

test("an error stops paging and is returned", async () => {
  const failure = { message: "boom" };
  let calls = 0;
  const page = async (from) =>
    ++calls === 1 ? { data: [{ id: from }], error: null } : { data: null, error: failure };
  const result = await fetchAllRows(page);
  assert.equal(result.error, failure);
  assert.equal(calls, 2);
});
