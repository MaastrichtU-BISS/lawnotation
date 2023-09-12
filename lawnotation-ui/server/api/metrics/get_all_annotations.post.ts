import { RichAnnotation } from "~/data/annotation";

export default eventHandler(async (event) => {
  const data = await readBody(event);

  let promises: Promise<RichAnnotation>[] = [];
  data.labels.map((l: string) => {
    promises.push(
      $fetch("/api/metrics/get_annotations", {
        method: "POST",
        body: JSON.stringify({
          task_id: data.task_id,
          label: l,
          documents: data.documents,
          annotators: data.annotators,
        }),
      })
    );
  });

  return Promise.all(promises);
});
