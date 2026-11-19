// pnpm test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchRowsByIds } from "../server/utils/fetch_all_rows.ts";

// Rows keyed by owner id, served by a PostgREST capped at `maxRows` a request.
const server = (rowsPerOwner, maxRows = 1000) => {
  const requests = [];
  const page = async (ids, from, to) => {
    requests.push(ids.length);
    const rows = ids.flatMap((owner) => Array.from({ length: rowsPerOwner }, (_, i) => ({ owner, i })));
    return { data: rows.slice(from, Math.min(to + 1, from + maxRows)), error: null };
  };
  return { requests, page };
};

test("every row comes back, in the order of the ids", async () => {
  const ids = Array.from({ length: 650 }, (_, i) => 1000 - i);
  const { page } = server(7);
  const { data, error } = await fetchRowsByIds(ids, page);
  assert.equal(error, null);
  assert.equal(data.length, 650 * 7);
  assert.deepEqual([...new Set(data.map((r) => r.owner))], ids);
});

test("no request asks for more than 200 ids", async () => {
  const { requests, page } = server(1);
  await fetchRowsByIds(Array.from({ length: 450 }, (_, i) => i), page);
  assert.ok(requests.every((n) => n <= 200));
});

test("no ids, no request", async () => {
  const { requests, page } = server(1);
  assert.deepEqual((await fetchRowsByIds([], page)).data, []);
  assert.equal(requests.length, 0);
});

test("a failed chunk fails the whole fetch", async () => {
  const failure = { message: "boom" };
  const page = async (ids, from) =>
    ids[0] === 200 ? { data: null, error: failure } : { data: from ? [] : ids.map((id) => ({ id })), error: null };
  const result = await fetchRowsByIds(Array.from({ length: 600 }, (_, i) => i), page);
  assert.equal(result.error, failure);
  assert.deepEqual(result.data, []);
});
