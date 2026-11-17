import type { IaaInputData } from "vue-iaa-metrics";
import type { TaskExportData } from "~/server/utils/task_export";

export function toIaaInputData(data: TaskExportData): IaaInputData {
  const hybrid = data.document_labelset !== null;
  return {
    labelset: {
      labels: data.labelset.labels.map((label) => ({ name: label.name })),
    },
    ...(data.document_labelset
      ? {
          document_labelset: {
            labels: data.document_labelset.labels.map((label) => ({ name: label.name })),
          },
        }
      : {}),
    documents: data.documents.map((doc) => ({
      // Matches the document filter's option values (see metricsSource.ts),
      // so vue-iaa-metrics can narrow the input to the selected documents.
      id: doc.id.toString(),
      name: doc.name,
      full_text: doc.full_text,
      assignments: doc.assignments.map((ass) => ({
        annotator: ass.annotator_email,
        difficulty_rating: ass.difficulty_rating,
        annotations: ass.annotations.map((ann) => ({
          start: ann.start,
          end: ann.end,
          label: ann.label,
          text: ann.text,
        })),
        ...(hybrid
          ? { document_annotations: ass.document_annotations.map((d) => ({ label: d.label })) }
          : {}),
      })),
    })),
    annotation_level: hybrid
      ? "hybrid"
      : data.task.annotation_level === "document"
        ? "document"
        : undefined,
  };
}
