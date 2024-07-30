
export type RangeLabel = {
  start: number;
  end: number;
  label: string;
  text: string;
  annotators: any;
  doc_id: string;
  doc_name: string;
  zeros: number;
  ones: number;
  confidences: any;
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
  confidence: number;
};

export type MetricResult = {
  name: string;
  po: number | undefined;
  pe: number | undefined;
  result: number | undefined;
  table: RangeLabel[] | undefined;
};

export type DifficultyMetricResult = {
  average: number;
  min: number;
  max: number;
  total: number;
  rated: number;
  unrated: number;
  krippendorff: MetricResult | undefined;
  values: number[];
  table: {
    annotator: string;
    doc_id: string;
    ass_id: string;
    rating: number;
  }[];
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

export function createContingencyTable(
  annotations: any[],
  annotators: string[],
  tolerance: number = 0,
  contained: boolean = false
): RangeLabel[] {
  var table: RangeLabel[] = [];

  annotations.forEach((x) => {
    const ann: RangeLabel = {
      start: x.start,
      end: x.end,
      label: x.label,
      text: x.text,
      annotators: {},
      doc_id: x.doc_id,
      doc_name: x.doc_name,
      zeros: 0,
      ones: 0,
      confidences: {}
    };

    if(x.annotator.length) {
      ann.confidences[x.annotator] = x.confidence;
    }

    let matches = false;
    if (table.length > 0) {
      matches = containsRangeLabel(
        table[table.length - 1],
        ann,
        tolerance,
        contained
      );
    }
    if (!matches) {
      table.push(ann);
      annotators.forEach((a) => {
        const owns_annotation = x.annotator == a;
        table[table.length - 1].annotators[a] = owns_annotation ? 1 : 0;
        if (owns_annotation) table[table.length - 1].ones++;
        else table[table.length - 1].zeros++;
      });
    } else {
      table[table.length - 1].ones++;
      table[table.length - 1].zeros--;
      table[table.length - 1].annotators[x.annotator] = 1;
      table[table.length - 1].confidences[x.annotator] = x.confidence;
    }
  });

  return table;
}

export function isContained(x: RangeLabel, y: RangeLabel): boolean {
  return x.start >= y.start && x.end <= y.end;
}

export function containsRangeLabel(
  x: RangeLabel,
  y: RangeLabel,
  tolerance: number = 0,
  contained: boolean = false
): boolean {
  if (x.doc_id == y.doc_id && x.label == y.label && x.zeros > 0) {
    if (contained) {
      return isContained(x, y) || isContained(y, x);
    } else {
      for (let t = 0; t <= tolerance; t++) {
        if (
          Math.abs(x.start - y.start) <= t &&
          Math.abs(x.end - y.end) <= tolerance - t
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

export function getExampleFleiss() {
  var table = [];

  table.push({
    start: "1",
    end: "1",
    label: "Happy",
    text: "Happy",
    annotators: { ann1: 0, ann2: 0, ann3: 0 },
  });

  table.push({
    start: "2",
    end: "2",
    label: "Happy",
    text: "Happy",
    annotators: { ann1: 0, ann2: 1, ann3: 0 },
  });

  table.push({
    start: "3",
    end: "3",
    label: "Happy",
    text: "Happy",
    annotators: { ann1: 1, ann2: 1, ann3: 1 },
  });

  table.push({
    start: "4",
    end: "4",
    label: "Happy",
    text: "Happy",
    annotators: { ann1: 1, ann2: 0, ann3: 0 },
  });

  table.push({
    start: "5",
    end: "5",
    label: "Happy",
    text: "Happy",
    annotators: { ann1: 0, ann2: 0, ann3: 0 },
  });

  table.push({
    start: "6",
    end: "6",
    label: "Happy",
    text: "Happy",
    annotators: { ann1: 1, ann2: 1, ann3: 0 },
  });

  table.push({
    start: "7",
    end: "7",
    label: "Happy",
    text: "Happy",
    annotators: { ann1: 0, ann2: 0, ann3: 1 },
  });

  return table;
}

export function getExampleCohens() {
  var table = [];
  for (let i = 1; i <= 17; i++) {
    table.push({
      start: i.toString(),
      end: i.toString(),
      label: "TP",
      text: i.toString(),
      annotators: { ann1: 1, ann2: 1 },
    });
  }

  for (let i = 18; i <= 36; i++) {
    table.push({
      start: i.toString(),
      end: i.toString(),
      label: "TN",
      text: i.toString(),
      annotators: { ann1: 0, ann2: 0 },
    });
  }

  for (let i = 37; i <= 44; i++) {
    table.push({
      start: i.toString(),
      end: i.toString(),
      label: "FP",
      text: i.toString(),
      annotators: { ann1: 0, ann2: 1 },
    });
  }

  for (let i = 45; i <= 50; i++) {
    table.push({
      start: i.toString(),
      end: i.toString(),
      label: "FN",
      text: i.toString(),
      annotators: { ann1: 1, ann2: 0 },
    });
  }
  return table;
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
