// pnpm test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { documentRelationLabelsOf } from "../utils/relationLabels.ts";

// What the pages pass: the kit's standard eight (any list does for this test).
const DEFAULTS = Object.freeze(["Is a", "Has a", "Part of"]);

test("a task without a document labelset gives nothing, so the kit keeps using the labelset's labels", () => {
  assert.equal(documentRelationLabelsOf(undefined, DEFAULTS), undefined);
});

test("a document labelset with its own relation labels gives those", () => {
  assert.deepEqual(documentRelationLabelsOf({ relation_labels: ["Cites", "Overrules"] }, DEFAULTS), ["Cites", "Overrules"]);
});

test("a document labelset without any gives the standard eight", () => {
  assert.deepEqual(documentRelationLabelsOf({ relation_labels: null }, DEFAULTS), [...DEFAULTS]);
  assert.deepEqual(documentRelationLabelsOf({}, DEFAULTS), [...DEFAULTS]);
});

test("the list handed out is a copy, so a consumer cannot change the defaults", () => {
  const labels = documentRelationLabelsOf({ relation_labels: null }, DEFAULTS);
  labels.push("Cites");
  assert.equal(DEFAULTS.includes("Cites"), false);
});
