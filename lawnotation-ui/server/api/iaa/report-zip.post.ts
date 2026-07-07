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
  const url = `${config.iaaServiceUrl}/report.zip?criterion=${criterion}&granularity=${granularity}`;

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

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw createError({
      statusCode: response.status,
      statusMessage: errBody?.error ?? "IAA metrics service error",
    });
  }

  setResponseHeader(
    event,
    "content-type",
    response.headers.get("content-type") ?? "application/zip"
  );
  setResponseHeader(
    event,
    "content-disposition",
    response.headers.get("content-disposition") ?? 'attachment; filename="iaa_report.zip"'
  );

  return sendStream(event, response.body!);
});
