import type { AnnotationLevel } from "legal-annotation-kit";
import type { Task } from "~/types";
import { AnnotationLevels } from "~/utils/enums";

export function isDocumentLevel(task: Task) {
  return task.annotation_level == "document";
}

/** Label Studio called character granularity "symbol"; legal-annotation-kit does not. */
export function toKitLevel(level: string): AnnotationLevel {
  return level === AnnotationLevels.SYMBOL ? "character" : (level as AnnotationLevel);
}
