// pnpm test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { hybridKindFilter } from "../server/utils/annotation_kind_filter.ts";

test("no label filter is no filter", () => {
  assert.equal(hybridKindFilter({}), null);
  assert.equal(hybridKindFilter({ labels: [], document_labels: [] }), null);
});

test("each kind answers to its own labels", () => {
  assert.deepEqual(hybridKindFilter({ labels: ["Actor"], document_labels: ["Relevant"] }), [
    { kind: "span", labels: ["Actor"] },
    { kind: "document", labels: ["Relevant"] },
  ]);
  assert.deepEqual(hybridKindFilter({ labels: ["Actor"] }), [
    { kind: "span", labels: ["Actor"] },
    { kind: "document", labels: null },
  ]);
  assert.deepEqual(hybridKindFilter({ document_labels: ["Relevant"] }), [
    { kind: "span", labels: null },
    { kind: "document", labels: ["Relevant"] },
  ]);
});

test("None drops that kind", () => {
  assert.deepEqual(hybridKindFilter({ no_span_labels: true }), [{ kind: "document", labels: null }]);
  assert.deepEqual(hybridKindFilter({ no_document_labels: true, labels: ["A", "B"] }), [
    { kind: "span", labels: ["A", "B"] },
  ]);
  assert.equal(hybridKindFilter({ no_span_labels: true, no_document_labels: true }), "nothing");
});

test("labels with commas, brackets and quotes are passed through as they are", () => {
  const labels = ["a,b", "c (d)", 'say "hi"', "back\\slash"];
  assert.deepEqual(hybridKindFilter({ labels, no_document_labels: true }), [{ kind: "span", labels }]);
});
