export type Task = {
  id: number;
  name: string;
  desc: string;
  project_id: number;
  labelset_id: number;
  ann_guidelines: string;
  annotation_level: 'word' | 'document';
};

export function isWordLevel(task: Task) {
  return task.annotation_level == "word" || task.annotation_level == undefined;
}

export function isDocumentLevel(task: Task) {
  return task.annotation_level == "document";
}