import { ApiError, createLegalDocsClient, type LegalDocsClient } from "node-legal-docs-client";

// The Case Law Explorer API key only lives on the server: the browser talks to
// the /api/legal-docs routes, never to the API itself, so the key can't be
// read out of the page.
let client: LegalDocsClient | undefined;

export function useLegalDocsClient(): LegalDocsClient {
  if (!client) {
    const { citationsApiKey } = useRuntimeConfig();
    if (!citationsApiKey) {
      throw createError({
        statusCode: 503,
        statusMessage: "Legal documents search is not configured",
      });
    }
    client = createLegalDocsClient({ apiKey: citationsApiKey });
  }
  return client;
}

// Turns a client failure into an error that is safe to show the person
// searching: a rejected query keeps its reason, but a problem with the
// platform's own key is only logged.
export function toLegalDocsError(error: unknown) {
  if (error instanceof ApiError && error.status === 400) {
    return createError({ statusCode: 400, statusMessage: error.message });
  }
  console.error("Legal documents API error:", error);
  if (error instanceof ApiError && error.status === undefined) {
    return createError({
      statusCode: 504,
      statusMessage: "Legal documents service unreachable",
    });
  }
  return createError({
    statusCode: 502,
    statusMessage: "Legal documents service error",
  });
}
