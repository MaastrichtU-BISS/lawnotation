import type { EchrQueryParameters, RechtspraakQueryParameters } from "node-legal-docs-client";

// Runs a vue-legal-query-builder query ({ dataset, params }) and returns the
// full text of every matching document. Public on purpose: legal document
// search is open to everyone, not only logged-in users.
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
    if (query.dataset === "ECHR") {
      const { nodes } = await client.fetchEchr(query.params as EchrQueryParameters);
      return nodes.length ? await client.getEchrFullText(nodes.map((doc) => doc.id)) : [];
    }
    const { nodes } = await client.fetchRechtspraak(query.params as RechtspraakQueryParameters);
    return nodes.length ? await client.getRechtspraakFullText(nodes.map((doc) => doc.id)) : [];
  } catch (error) {
    throw toLegalDocsError(error);
  }
});
