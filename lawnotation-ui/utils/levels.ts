import type { Task } from "~/types";

export function isDocumentLevel(task: Task) {
  return task.annotation_level == "document";
}

export function getDocFormat(docName: string) {
  const splitted = docName.split('.');
  const format = splitted[splitted.length - 1];
  return format;
}