// How much one legal document search returns. A Vercel function has about 15
// seconds and a 4.5 MB response, and a broad search can match thousands of
// documents, so a search is capped and the person told how much was left out.
export const MAX_SEARCH_DOCUMENTS = 100;
export const MAX_SEARCH_RESPONSE_BYTES = 4_000_000;

type FullTextDocument = { ecli: string; fullText?: string | null; languages?: unknown };

export type LegalDocsSearchResult<T> = {
  documents: T[];
  // Documents matching the query, when the API reports it.
  total: number | null;
  truncated: boolean;
};

export function limitSearchResult<T extends FullTextDocument>(
  documents: T[],
  total: number | null = null,
): LegalDocsSearchResult<Omit<T, "languages">> {
  const kept: Omit<T, "languages">[] = [];
  let bytes = 0;

  for (const document of documents) {
    if (kept.length === MAX_SEARCH_DOCUMENTS) break;
    // ECHR documents carry every translation, and only the default one is used.
    const { languages: _languages, ...rest } = document;
    bytes += Buffer.byteLength(JSON.stringify(rest));
    if (bytes > MAX_SEARCH_RESPONSE_BYTES) break;
    kept.push(rest);
  }

  return {
    documents: kept,
    total,
    truncated: kept.length < Math.max(documents.length, total ?? 0),
  };
}
