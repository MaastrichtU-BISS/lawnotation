export type User = {
  id: string;
  email: string;
  role: "editor" | "annotator"; // to be discarded
};

export interface Annotator extends User {
  annotator_number: number;
}