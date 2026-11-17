import type { AnnotationLevel } from "legal-annotation-kit";
import type { Task } from "~/types";
import { AnnotationLevels } from "~/utils/enums";

export function isDocumentLevel(task: Task) {
  return task.annotation_level == "document";
}

/** A span-level task that also has a labelset for whole-document tags. */
export function isHybrid(task: Pick<Task, "annotation_level" | "document_labelset_id">) {
  return task.annotation_level != "document" && task.document_labelset_id != null;
}

/**
 * How a task's level reads in a "Level" column: the level itself, or for a
 * hybrid task its span granularity plus document tags ("word + document tags").
 */
export function taskLevelLabel(task: Pick<Task, "annotation_level" | "document_labelset_id">): string {
  return isHybrid(task) ? `${task.annotation_level} + document tags` : task.annotation_level;
}

/** Which kinds of annotation a task holds: spans, document tags, or both. */
export type TaskKinds = { spans: boolean; documents: boolean };

export function taskKinds(task: Pick<Task, "annotation_level" | "document_labelset_id">): TaskKinds {
  if (task.annotation_level == "document") return { spans: false, documents: true };
  return { spans: true, documents: task.document_labelset_id != null };
}

/** Label Studio called character granularity "symbol"; legal-annotation-kit does not. */
export function toKitLevel(level: string): AnnotationLevel {
  return level === AnnotationLevels.SYMBOL ? "character" : (level as AnnotationLevel);
}
