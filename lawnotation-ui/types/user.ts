export type User = {
  id: string;
  email: string;
  role: "editor" | "annotator"; // to be discarded
};