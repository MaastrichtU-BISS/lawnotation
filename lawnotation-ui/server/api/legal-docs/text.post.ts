import { TEXT_BATCH_SIZE } from "~/utils/legal_docs";

// The full texts of up to TEXT_BATCH_SIZE documents found by
// /api/legal-docs/search: POST { dataset: 'RS' | 'ECHR', eclis: string[] }.
// The Case Law Explorer API takes at most 200 ECLIs per text request.
// Public, like the search route.
export default eventHandler(async (event) => {
  const body = await readBody(event);
  const eclis = body?.eclis;
  if (
    (body?.dataset !== "RS" && body?.dataset !== "ECHR") ||
    !Array.isArray(eclis) ||
    eclis.length === 0 ||
    eclis.length > TEXT_BATCH_SIZE ||
    !eclis.every((ecli) => typeof ecli === "string" && ecli.length > 0 && ecli.length <= 200)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: `Expected a body of { dataset: 'RS' | 'ECHR', eclis } with 1 to ${TEXT_BATCH_SIZE} ECLIs`,
    });
  }

  const client = useLegalDocsClient();
  try {
    return body.dataset === "ECHR"
      ? await client.getEchrFullText(eclis)
      : await client.getRechtspraakFullText(eclis);
  } catch (error) {
    throw toLegalDocsError(error);
  }
});
