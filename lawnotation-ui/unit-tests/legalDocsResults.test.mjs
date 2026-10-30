import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SEARCH_DOCUMENTS,
  MAX_SEARCH_RESPONSE_BYTES,
  limitSearchResult,
} from "../server/utils/legal_docs_results.ts";

const documents = (count, fullText = "text") =>
  Array.from({ length: count }, (_, i) => ({ ecli: `ECLI:${i}`, fullText }));

test("keeps a small result whole", () => {
  const result = limitSearchResult(documents(3), 3);
  assert.equal(result.documents.length, 3);
  assert.equal(result.total, 3);
  assert.equal(result.truncated, false);
});

test("reports a result cut short by the page size", () => {
  const result = limitSearchResult(documents(MAX_SEARCH_DOCUMENTS), 2705);
  assert.equal(result.documents.length, MAX_SEARCH_DOCUMENTS);
  assert.equal(result.truncated, true);
});

test("never returns more than the document cap", () => {
  const result = limitSearchResult(documents(MAX_SEARCH_DOCUMENTS + 5));
  assert.equal(result.documents.length, MAX_SEARCH_DOCUMENTS);
  assert.equal(result.truncated, true);
});

test("stops before the response size limit", () => {
  const large = "x".repeat(MAX_SEARCH_RESPONSE_BYTES / 2);
  const result = limitSearchResult(documents(5, large), 5);
  assert.equal(result.documents.length, 1);
  assert.equal(result.truncated, true);
});

test("drops the translations of ECHR documents", () => {
  const [document] = limitSearchResult([
    { ecli: "ECLI:1", fullText: "text", languages: { en: {}, fr: {} } },
  ]).documents;
  assert.equal("languages" in document, false);
  assert.equal(document.fullText, "text");
});

test("handles an empty result", () => {
  const result = limitSearchResult([], null);
  assert.deepEqual(result, { documents: [], total: null, truncated: false });
});
