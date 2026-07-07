import type { TaskExportData } from "~/server/utils/task_export";

export type IaaAnnotation = {
  start: number;
  end: number;
  label: string;
  text: string;
};

export type IaaAssignment = {
  annotator: string;
  difficulty_rating: number;
  annotations: IaaAnnotation[];
};

export type IaaDocument = {
  name: string;
  full_text: string;
  assignments: IaaAssignment[];
};

export type IaaInputData = {
  labelset: { labels: { name: string }[] };
  documents: IaaDocument[];
  annotation_level?: "document";
};

export function toIaaInputData(data: TaskExportData): IaaInputData {
  return {
    labelset: {
      labels: data.labelset.labels.map((label) => ({ name: label.name })),
    },
    documents: data.documents.map((doc) => ({
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
      })),
    })),
    annotation_level: data.task.annotation_level === "document" ? "document" : undefined,
  };
}
