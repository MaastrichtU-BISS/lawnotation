export type RangeLabel = {
  start: number;
  end: number;
  label: string;
  text: string;
  annotators: any;
};

export type KappaResult = {
  po: number;
  pe: number;
  result: number;
  table: RangeLabel[];
  variant: string;
};

export function sortByRange(ranges: RangeLabel[]): void {
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
