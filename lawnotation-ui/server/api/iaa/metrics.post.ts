import { buildIaaInputData } from "~/server/utils/iaa";

export default eventHandler(async (event) => {
  const data = await readBody(event);
  const config = useRuntimeConfig();

  const input = await buildIaaInputData(event, {
    task_id: data.task_id,
    labelset_id: data.labelset_id,
    annotation_level: data.annotation_level,
    documentIds: data.documents,
    annotatorEmails: data.annotators,
    labelNames: data.labels,
  });

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
