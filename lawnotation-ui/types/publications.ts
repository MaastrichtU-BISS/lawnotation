export type Publication = {
  id: number;
  editor_id: string,
  status: "published" | "unpublished"
  file_url: string;
  guidelines_url: string;
  task_name: string;
  task_description: string;
  labels_name: string;
  labels_description: string;
  author: string;
  contact: string;
  documents: number;
  assignments: number;
  annotators: number;
  annotations: number;
  relations: number;
};
