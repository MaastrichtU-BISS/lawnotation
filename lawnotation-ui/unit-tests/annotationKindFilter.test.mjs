// pnpm test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { hybridKindFilter, inList } from "../server/utils/annotation_kind_filter.ts";

test("no label filter is no filter", () => {
  assert.equal(hybridKindFilter({}), null);
  assert.equal(hybridKindFilter({ labels: [], document_labels: [] }), null);
});

test("each kind answers to its own labels", () => {
  assert.equal(
    hybridKindFilter({ labels: ["Actor"], document_labels: ["Relevant"] }),
    'and(kind.eq.span,label.in.("Actor")),and(kind.eq.document,label.in.("Relevant"))'
  );
  assert.equal(hybridKindFilter({ labels: ["Actor"] }), 'and(kind.eq.span,label.in.("Actor")),kind.eq.document');
});

test("None drops that kind", () => {
  assert.equal(hybridKindFilter({ no_span_labels: true }), "kind.eq.document");
  assert.equal(
    hybridKindFilter({ no_document_labels: true, labels: ["A", "B"] }),
    'and(kind.eq.span,label.in.("A","B"))'
  );
  assert.equal(hybridKindFilter({ no_span_labels: true, no_document_labels: true }), "nothing");
});

test("labels with commas, brackets and quotes stay one value", () => {
  assert.equal(inList(['a,b', 'c (d)', 'say "hi"', "back\\slash"]), '("a,b","c (d)","say \\"hi\\"","back\\\\slash")');
});
