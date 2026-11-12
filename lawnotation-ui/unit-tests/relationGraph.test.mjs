// pnpm test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { toRelationGraph, nodeId } from "../utils/relationGraph.ts";

const queue = () => ({
  documents: [
    { assignment_id: 10, seq_pos: 1, document_name: "a.txt", snippet: "First ruling." },
    { assignment_id: 11, seq_pos: 2, document_name: "b.txt", snippet: "Second ruling." },
    { assignment_id: 12, seq_pos: 3, document_name: "b.txt", snippet: "Another b." }, // same name
  ],
  relations: [
    { from: 10, to: 11, labels: ["Cites"] },
    { from: 11, to: 12, labels: ["Implies", "Related to"] },
    { from: 12, to: 10, labels: [] },
  ],
});

const request = (relations) => ({
  document: { name: "a.txt", order: 1, key: "10" },
  relations,
  incomingRelations: [],
});

test("one node per document, told apart by position, with the start of the text", () => {
  const { nodes } = toRelationGraph(queue());
  assert.deepEqual(nodes.map((n) => n.id), ["10", "11", "12"]);
  assert.equal(nodes[1].title, "b.txt (#2)");
  assert.equal(nodes[2].title, "b.txt (#3)");
  assert.equal(nodes[0].description, "First ruling.");
});

test("one edge per stored relation, labelled with its labels", () => {
  const { edges } = toRelationGraph(queue());
  assert.deepEqual(edges, [
    { source: "10", target: "11", label: "Cites" },
    { source: "11", target: "12", label: "Implies, Related to" },
    { source: "12", target: "10", label: "" },
  ]);
});

test("without a request nothing is marked as open", () => {
  assert.equal(toRelationGraph(queue()).currentId, undefined);
});

test("the open document's own relations come from the request, unsaved edits included", () => {
  // Stored: 10 -> 11. The annotator removed it and linked 10 -> 12 instead, unsaved.
  const { edges, currentId } = toRelationGraph(queue(), request([{ to: "12", labels: ["Part of"] }]));
  assert.equal(currentId, "10");
  assert.deepEqual(edges.filter((e) => e.source === "10"), [{ source: "10", target: "12", label: "Part of" }]);
  // The others' relations are untouched.
  assert.equal(edges.filter((e) => e.source !== "10").length, 2);
});

test("a relation to a document outside the queue is left out", () => {
  const { edges } = toRelationGraph(queue(), request([{ to: "999", labels: [] }]));
  assert.deepEqual(edges.filter((e) => e.source === "10"), []);
});

test("an open document that is not in the queue is not marked", () => {
  const { currentId } = toRelationGraph(queue(), { ...request([]), document: { name: "x", order: 9, key: "777" } });
  assert.equal(currentId, undefined);
});

test("nodeId is the assignment id as text, as the kit's document keys are", () => {
  assert.equal(nodeId(42), "42");
});
