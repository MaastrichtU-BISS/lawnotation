import {
  RangeLabel,
  KappaResult,
  sortByRange,
  containsRangeLabel,
} from "~/utils/metrics";

export default eventHandler(async (event) => {
  const data = await readBody(event);
  const table = createContingencyTable(
    data.annotations,
    data.annotators,
    data.text,
    data.tolerance
  );
  return computeFleissKappa(table);
});

function createContingencyTable(
  annotations: any[],
  annotators: string[],
  text: string,
  tolerance: number
): RangeLabel[] {
  var ranges: RangeLabel[] = [];

  // Add annotated ranges (True positives, False Positives and False Negatives)
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

  // sort annotated ranges by range
  sortByRange(ranges);

  // Add non annotated ranges (TRUE NEGATIVES) (text in between every pair of neighbour annotations)
  const trueRangesLength = ranges.length;
  var last_end = 0;
  for (let i = 0; i < trueRangesLength; ++i) {
    var current_start = ranges[i].start;
    if (last_end <= current_start) {
      ranges.push({
        start: last_end,
        end: current_start,
        label: "NON ANNOTATED",
        text: text.substring(last_end, current_start),
        annotators: {},
      });
      annotators.forEach((a) => {
        ranges[ranges.length - 1].annotators[a] = 0;
      });
    }
    var last_end = ranges[i].end;
  }

  ranges.push({
    start: last_end,
    end: text.length,
    label: "NON ANNOTATED",
    text: text.substring(last_end, text.length),
    annotators: {},
  });
  annotators.forEach((a) => {
    ranges[ranges.length - 1].annotators[a] = 0;
  });

  sortByRange(ranges);

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
