import { Origins } from "~/utils/enums";

export type Annotation = {
  id: number;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  origin: Origins,
  ls_id: string;
  label: string;
  html_metadata?: {
    start: string;
    end: string;
    startOffset: number;
    endOffset: number;
    globalOffsets: {
      start: number;
      end: number;
    }
  },
  metadata?: string,
  confidence_rating: number;
};
