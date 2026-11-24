import type { EchrFullTextDocument, RechtspraakFullTextDocument } from "legal-docs-types";

/** Most ECLIs the Case Law Explorer API returns full texts for in one request. */
export const TEXT_BATCH_SIZE = 200;
/** Text requests in flight at once, to keep large searches quick without crowding the API. */
const TEXT_CONCURRENCY = 3;

export type FullTextDocument = RechtspraakFullTextDocument | EchrFullTextDocument;

/**
 * The full texts of these documents, fetched TEXT_BATCH_SIZE at a time through
 * /api/legal-docs/text, in the order given. `onProgress` hears how many have
 * arrived.
 */
export async function fetchFullTexts(
  dataset: "RS" | "ECHR",
  eclis: readonly string[],
  onProgress?: (done: number, total: number) => void
): Promise<FullTextDocument[]> {
  const batches: string[][] = [];
  for (let i = 0; i < eclis.length; i += TEXT_BATCH_SIZE) batches.push(eclis.slice(i, i + TEXT_BATCH_SIZE));

  const results: FullTextDocument[][] = new Array(batches.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < batches.length) {
      const index = next++;
      results[index] = await $fetch<FullTextDocument[]>("/api/legal-docs/text", {
        method: "POST",
        body: { dataset, eclis: batches[index] },
        retry: 1,
      });
      done += batches[index]!.length;
      onProgress?.(done, eclis.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(TEXT_CONCURRENCY, batches.length) }, worker));
  return results.flat();
}
