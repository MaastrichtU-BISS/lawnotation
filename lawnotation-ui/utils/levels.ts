import type { Task } from "~/types";

export function isWordLevel(task: Task) {
  return task.annotation_level == "word" || task.annotation_level == undefined;
}

export function isDocumentLevel(task: Task) {
  return task.annotation_level == "document";
}
