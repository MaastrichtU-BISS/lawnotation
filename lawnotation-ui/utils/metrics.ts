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

// Retained for server/trpc/routers/metrics.router.ts, an unwired migration
// scaffold (see its own top-of-file note) that still calls these via
// Nuxt's utils/ auto-import.
export type MetricResult = {
  name: string;
  po: number | undefined;
  pe: number | undefined;
  result: number | undefined;
  table: any[] | undefined;
};

export function newEmptyMetricResult(name: string): MetricResult {
  return {
    name: name,
    po: undefined,
    pe: undefined,
    result: undefined,
    table: undefined,
  } as MetricResult;
}

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

export function setTextToHidden(
  annotations: RichAnnotation[],
  value: boolean
): RichAnnotation[] {
  for (let i = 0; i < annotations.length; i++) {
    if (
      annotations[i].ann_id == -1 &&
      !/[ˆa-zA-Z]{2}/.test(annotations[i].text)
    )
      annotations[i].hidden = value;
  }
  return annotations;
}

export function separateIntoWords(annotations: RichAnnotation[]) {
  let limit = 10 ** 6;
  var new_annotations: RichAnnotation[] = [];

  annotations.forEach((ann) => {
    const words = ann.text.matchAll(/\S+/g);
    while (limit > 0) {
      const w = words.next();
      if (w.done) break;
      new_annotations.push({
        start: ann.start + w.value.index!,
        end: ann.start + w.value.index! + w.value[0].length,
        text: w.value[0],
        label: ann.label,
        annotator: ann.annotator,
        hidden: false,
        ann_id: ann.ann_id,
        doc_id: ann.doc_id,
        doc_name: ann.doc_name,
        confidence: ann.confidence
      });
      limit--;
    }
  });
  sortByDocumentAndRange(new_annotations);
  return new_annotations;
}
