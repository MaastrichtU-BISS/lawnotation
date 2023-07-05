export interface Annotation {
  id: number;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  origin: string;
  ls_id: string;
  label: string;
};

export interface LSSerializedAnnotation {
  id: string;
  from_name: string;
  to_name: string;
  origin: string;
  type: string;
  value: {
    start: number;
    end: number;
    text: string;
    labels: string[];
  };
};

export type LSSerializedAnnotations = LSSerializedAnnotation[];