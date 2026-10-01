import { Origins } from "~/utils/enums";

export type Annotation = {
  id: number;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  origin: Origins,
  label: string;
  metadata?: string,
  confidence_rating: number;
};
