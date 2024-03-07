export type Annotation = {
  id: number;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  origin: string;
  ls_id: string;
  label: string;
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
  type: string;
  value: {
    start?: number;
    end?: number;
    text?: string;
    labels?: string[];
    choices?: string[];
  };
};

export type LSSerializedAnnotations = LSSerializedAnnotation[]; 