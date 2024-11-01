import { type RichAnnotation } from "~/utils/metrics";

export default eventHandler(async (event) => {
  const data = await readBody(event);

  let promises: Promise<RichAnnotation[]>[] = [];
  data.labels.map((l: string) => {
    promises.push(
      $fetch("/api/metrics/get_annotations", {
        method: "POST",
        body: JSON.stringify({
          task_id: data.task_id,
          label: l,
          documents: data.documents,
          annotators: data.annotators,
          byWords: data.byWords,
          hideNonText: data.hideNonText,
          documentLevel: data.documentLevel
        }),
      })
    );
  });

  return Promise.all(promises);
});
