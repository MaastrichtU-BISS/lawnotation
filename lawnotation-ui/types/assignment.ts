export type Assignment = {
  id: number;
  annotator_id: string;
  task_id: number;
  document_id: number;
  status: string;
  seq_pos: number;
  difficulty_rating: number;
};

export type AssignmentTableData = {
  id: number;
  task_id: number;
  annotator: {
    id: string;
    email: string;
  };
  document: {
    id: number;
    name: string;
    source: string;
    // full_text: string
  };
  status: string;
  seq_pos: number;
  difficulty_rating: number;
};