// The metrics page builds `input` once (via the authorized
// metrics.get_input_data trpc procedure) and caches it client-side, so this
// route is a thin proxy: it never touches Supabase itself.
export default eventHandler(async (event) => {
  const data = await readBody(event);
  const config = useRuntimeConfig();

  const input = data.input;

  const criterion = data.criterion ?? "exact";
  const granularity = data.granularity ?? "word";
  const url = `${config.iaaServiceUrl}/metrics?criterion=${criterion}&granularity=${granularity}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: "IAA metrics service unreachable",
    });
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: body?.error ?? "IAA metrics service error",
    });
  }

  return body;
});
