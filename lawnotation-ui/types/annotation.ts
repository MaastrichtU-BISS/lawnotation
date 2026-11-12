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
  /** "document" for a tag on the whole document; spans are the default. */
  kind?: "span" | "document";
};
