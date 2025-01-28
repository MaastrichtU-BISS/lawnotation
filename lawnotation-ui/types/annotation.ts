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

export type LSSerializedAnnotation = {
  id: string;
  from_name: string;
  to_name: string;
  origin: "manual" | "imported" | "model";
  type: "labels" | "choices" | "hypertextlabels" | "rating";
  meta?: {
    text?: string[]
  },
  value: {
    start?: number | string;
    end?: number | string;
    text?: string;
    labels?: string[];
    choices?: string[];
    confidence_rating?: number;
    hypertextlabels?: string[];
    startOffset?: number;
    endOffset?: number;
    globalOffsets?: {
      start: number;
      end: number;
    }
  };
};

export type LSSerializedAnnotations = LSSerializedAnnotation[]; 