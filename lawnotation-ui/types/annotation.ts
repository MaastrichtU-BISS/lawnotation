export type Annotation = {
  id: number;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  origin: string;
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
  confidence_rating: number;
};

export type RichAnnotation = {
  start: number;
  end: number;
  text: string;
  label: string;
  annotator: string;
  hidden: boolean;
  ann_id: number;
  doc_id: number;
  doc_name?: string;
};

export type LSSerializedAnnotation = {
  id: string;
  from_name: string;
  to_name: string;
  origin: string;
  type: "labels" | "choices" | "hypertextlabels" | "rating";
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