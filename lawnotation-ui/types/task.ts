import { AnnotationLevels } from "~/utils/enums";

export type Task = {
  id: number;
  name: string;
  desc: string;
  project_id: number;
  labelset_id: number;
  /** Hybrid tasks: labelset for the whole-document tags. Span level only. */
  document_labelset_id?: number | null;
  ann_guidelines: string;
  ml_model_id?: number;
  annotation_level: AnnotationLevels;
  origin_task_1_id?: number;
  origin_task_2_id?: number;
};