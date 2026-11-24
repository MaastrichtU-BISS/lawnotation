import type { EchrQueryParameters, RechtspraakQueryParameters } from "node-legal-docs-client";

// Runs a vue-legal-query-builder query ({ dataset, params }) and returns the
// ids (ECLIs) of the matching documents, in the order the API gives them. The
// full texts come from /api/legal-docs/text, at most TEXT_BATCH_SIZE at a time:
// the Case Law Explorer API refuses more per request, and a large search's
// texts (tens of megabytes) shouldn't travel in one response anyway.
// Public on purpose: legal document search is open to everyone, not only
// logged-in users.
export default eventHandler(async (event) => {
  const query = await readBody(event);
  if (
    (query?.dataset !== "RS" && query?.dataset !== "ECHR") ||
    typeof query.params !== "object" ||
    query.params === null
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Expected a body of { dataset: 'RS' | 'ECHR', params }",
    });
  }

  const client = useLegalDocsClient();
  try {
    const { nodes, graph } =
      query.dataset === "ECHR"
        ? await client.fetchEchr(query.params as EchrQueryParameters)
        : await client.fetchRechtspraak(query.params as RechtspraakQueryParameters);
    return {
      dataset: query.dataset as "RS" | "ECHR",
      eclis: [...new Set(nodes.map((doc) => doc.id))],
      // The API stops at its result and response limits (10,000 matches,
      // 5,000 nodes) and says so; edges don't matter here.
      truncated: (graph?.partialReasons ?? []).some((r) => r === "queryLimitReached" || r === "responseNodeLimit"),
    };
  } catch (error) {
    throw toLegalDocsError(error);
  }
});
