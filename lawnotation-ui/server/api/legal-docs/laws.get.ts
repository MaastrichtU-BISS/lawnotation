// Backs the query builder's law selector: GET /api/legal-docs/laws?q=<text>
// returns the laws whose title matches. Public, like the search route.
export default eventHandler(async (event) => {
  const { q } = getQuery(event);
  const text = typeof q === "string" ? q.trim() : "";
  if (!text) return [];

  try {
    return await useLegalDocsClient().fetchLaws(text);
  } catch (error) {
    throw toLegalDocsError(error);
  }
});
