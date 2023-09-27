import { RichAnnotation } from "~/data/annotation";
import { MetricResult, newEmptyMetricResult } from "~/utils/metrics";

const metrics = ["krippendorff", "fleiss_kappa", "cohens_kappa"];

export default eventHandler(async (event) => {
  const data = await readBody(event);

  let annotations: RichAnnotation[] = data.annotations ?? [];

  if (!annotations.length) {
    const ann_body = JSON.stringify({
      task_id: data.task_id,
      label: data.label,
      documents: data.documents,
      annotators: data.annotatorsOrEmpty,
      byWords: data.byWords,
      hideNonText: data.hideNonText,
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

  const metric_body = JSON.stringify({
    annotations: annotations.filter((ann) => !ann.hidden),
    annotators: ["90-" + data.annotators[0], "153-" + data.annotators[0]],
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
