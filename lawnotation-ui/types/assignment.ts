import { Origins, AssignmentStatuses } from "~/utils/enums";

export type Assignment = {
  id: number;
  annotator_id: string;
  task_id: number;
  document_id: number;
  status: AssignmentStatuses;
  seq_pos: number;
  difficulty_rating: number;
  annotator_number: number;
  origin: Origins
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
  status: AssignmentStatuses;
  seq_pos: number;
  difficulty_rating: number;
  annotator_number: number;
  origin: Origins
};

export function isUnfinishedByAnnotator(assignment: Assignment) {
  return assignment.status == 'pending' || assignment.status == 'pre-annotated' || assignment.status == 'failed';
}