import type { EchrQueryParameters, RechtspraakQueryParameters } from "node-legal-docs-client";

// Runs a vue-legal-query-builder query ({ dataset, params }) and returns the
// full text of the first matching documents, with how many matched in total.
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
  const params = { ...query.params, pageSize: MAX_SEARCH_DOCUMENTS };
  try {
    if (query.dataset === "ECHR") {
      const response = await client.fetchEchr(params as EchrQueryParameters);
      const ids = matchedIds(response);
      return limitSearchResult(ids.length ? await client.getEchrFullText(ids) : [], totalOf(response));
    }
    const response = await client.fetchRechtspraak(params as RechtspraakQueryParameters);
    const ids = matchedIds(response);
    return limitSearchResult(ids.length ? await client.getRechtspraakFullText(ids) : [], totalOf(response));
  } catch (error) {
    throw toLegalDocsError(error);
  }
});

// A query that follows citations can return more documents than its page size.
const matchedIds = ({ nodes }: { nodes: { id: string }[] }) =>
  nodes.slice(0, MAX_SEARCH_DOCUMENTS).map((doc) => doc.id);

const totalOf = (response: object) =>
  (response as { pagination?: { totalCount?: number } }).pagination?.totalCount ?? null;
