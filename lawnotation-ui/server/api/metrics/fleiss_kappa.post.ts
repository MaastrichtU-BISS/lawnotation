export default eventHandler(async (event) => {
  const data = await readBody(event);
  //   const table = getExample();
  const table = createContingencyTable(
    data.annotations,
    data.annotators,
    data.tolerance
  );
  return computeFleissKappa(table);
});

type RangeLabel = {
  start: number;
  end: number;
  label: string;
  text: string;
  annotators: any;
};

type KappaResult = {
  po: number;
  pe: number;
  result: number;
  table: RangeLabel[];
  variant: string;
};

function containsRangeLabel(
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

function createContingencyTable(
  annotations: any[],
  annotators: string[],
  tolerance: number
): RangeLabel[] {
  var ranges: RangeLabel[] = [];

  annotations.forEach((x) => {
    const ann: RangeLabel = {
      start: x.start,
      end: x.end,
      label: x.label,
      text: x.text,
      annotators: {},
    };
    const index = containsRangeLabel(ranges, ann, tolerance);
    if (index < 0) {
      ranges.push(ann);
      annotators.forEach((a) => {
        ranges[ranges.length - 1].annotators[a] = x.annotator == a ? 1 : 0;
      });
    } else {
      ranges[index].annotators[x.annotator] = 1;
    }
  });

  ranges.sort((x, y) => {
    if (x.start < y.start) {
      return -1;
    } else if (x.start == y.start) {
      return x.end <= y.end ? -1 : 1;
    } else {
      return 1;
    }
  });

  return ranges;
}

function computeFleissKappa(table: RangeLabel[]): KappaResult {
  var n: number = Object.entries(table[0].annotators).length;
  var N: number = table.length;
  var nN: number = n * N;

  var po_square_sum: number = 0;
  var pe_0_sum: number = 0;
  var pe_1_sum: number = 0;

  table.forEach((range) => {
    var pe_0_row_sum: number = 0;
    var pe_1_row_sum: number = 0;
    Object.entries(range.annotators).forEach(([k, v]) => {
      if (v == 0) pe_0_row_sum += 1;
      else pe_1_row_sum += 1;
    });
    po_square_sum += pe_0_row_sum * pe_0_row_sum + pe_1_row_sum * pe_1_row_sum;
    pe_0_sum += pe_0_row_sum;
    pe_1_sum += pe_1_row_sum;
  });

  var pe: number =
    (pe_0_sum / nN) * (pe_0_sum / nN) + (pe_1_sum / nN) * (pe_1_sum / nN);

  var po = (1 / (nN * (n - 1))) * (po_square_sum - nN);

  var kappa: number = (po - pe) / (1 - pe);

  return {
    po: po,
    pe: pe,
    result: kappa,
    table: table,
    variant: "Fleiss",
  } as KappaResult;
}

function getExample() {
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
