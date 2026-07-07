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
  confidence: number;
  original_task_id?: number;
  metadata?: string;
};

export function sortByDocumentAndRange(ranges: RichAnnotation[]): void {
  ranges.sort((x, y) => {
    if (x.doc_id < y.doc_id) {
      return -1;
    } else if (x.doc_id == y.doc_id) {
      if (x.start < y.start) {
        return -1;
      } else if (x.start == y.start) {
        return x.end <= y.end ? -1 : 1;
      } else {
        return 1;
      }
    } else {
      return 1;
    }
  });
}
