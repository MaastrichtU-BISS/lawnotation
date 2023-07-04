export interface User {
  id: string;
  email: string;
  role: "editor" | "annotator";
};