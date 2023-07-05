import { BasicAnnotation } from "~/data/annotation";

export type RangeLabel = {
  start: number;
  end: number;
  label: string;
  text: string;
  annotators: any;
  zeros: number;
  ones: number;
};

export type MetricResult = {
  name: string;
  po: number;
  pe: number;
  result: number;
  table: RangeLabel[];
  variant: string;
};

export function createContingencyTable(
  annotations: any[],
  annotators: string[],
  tolerance: number = 0
): RangeLabel[] {
  var table: RangeLabel[] = [];

  annotations.forEach((x) => {
    const ann: RangeLabel = {
      start: x.start,
      end: x.end,
      label: x.label,
      text: x.text,
      annotators: {},
      zeros: 0,
      ones: 0,
    };
    const index = containsRangeLabel(table, ann, tolerance);
    if (index < 0) {
      table.push(ann);
      annotators.forEach((a) => {
        const owns_annotation = x.annotator == a;
        table[table.length - 1].annotators[a] = owns_annotation ? 1 : 0;
        if (owns_annotation) table[table.length - 1].ones++;
        else table[table.length - 1].zeros++;
      });
    } else {
      table[index].ones++;
      table[index].zeros--;
      table[index].annotators[x.annotator] = 1;
    }
  });

  return table;
}

export function sortByRange(ranges: RangeLabel[] | BasicAnnotation[]): void {
  ranges.sort((x, y) => {
    if (x.start < y.start) {
      return -1;
    } else if (x.start == y.start) {
      return x.end <= y.end ? -1 : 1;
    } else {
      return 1;
    }
  });
}

export function containsRangeLabel(
  list: RangeLabel[],
  range: RangeLabel,
  tolerance: number = 0
): number {
  for (let i = 0; i < list.length; i++) {
    const x = list[i];
    if (x.label == range.label) {
      for (let t = 0; t <= tolerance; t++) {
        if (
          Math.abs(x.start - range.start) <= t &&
          Math.abs(x.end - range.end) <= tolerance - t
        ) {
          return i;
        }
      }
    }
  }
  return -1;
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
