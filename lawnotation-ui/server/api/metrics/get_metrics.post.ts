import { type RichAnnotation } from "~/utils/metrics";
import type { MetricResult } from "~/utils/metrics";
import { newEmptyMetricResult } from "~/utils/metrics";

const metrics = ["krippendorff", "fleiss_kappa", "cohens_kappa"];

export default eventHandler(async (event) => {
  const data = await readBody(event);

  let annotations: RichAnnotation[] = data.annotations ?? [];

  if (!annotations.length) {
    const ann_body = JSON.stringify({
      task_id: data.task_id,
      labels: [data.label],
      documents: data.documents,
      annotators: data.annotatorsOrEmpty,
      byWords: data.byWords,
      hideNonText: data.hideNonText,
      documentLevel: data.documentLevel,
      documentsData: data.documentsData,
      documentsOptions: data.documentsOptions,
    });

    annotations = await $fetch(`/api/metrics/get_annotations`, {
      method: "POST",
      body: ann_body,
    });
  }

  if (!annotations || annotations.length == 0) {
    return Promise.resolve(metrics.map((m) => newEmptyMetricResult(m)));
  }

  let metric_body = "";

  if (data.intraTaskIds?.length == 2) {
    metric_body = JSON.stringify({
      annotations: annotations.filter((ann) => !ann.hidden),
      annotators: [
        `${data.intraTaskIds[0]}-${data.annotators[0]}`,
        `${data.intraTaskIds[1]}-${data.annotators[0]}`,
      ],
      tolerance: data.tolerance,
      contained: data.contained,
    });

    return [await $fetch(`/api/metrics/cohens_kappa`, {
      method: "POST",
      body: metric_body,
    })];
  }

  metric_body = JSON.stringify({
    annotations: annotations.filter((ann) => !ann.hidden),
    annotators: data.annotators,
    tolerance: data.tolerance,
    contained: data.contained,
  });

  let promises: Promise<MetricResult>[] = [];
  metrics.map((m) => {
    promises.push(
      $fetch(`/api/metrics/${m}`, {
        method: "POST",
        body: metric_body,
      })
    );
  });

  return Promise.all(promises);
});
