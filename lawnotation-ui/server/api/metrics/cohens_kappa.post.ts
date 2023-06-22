import { RangeLabel, KappaResult, containsRangeLabel } from "~/utils/metrics";

export default eventHandler(async (event) => {
  const data = await readBody(event);
  const table = createContingencyTable(
    data.annotations,
    data.annotators,
    data.tolerance
  );
  return computeCohensKappa(table);
});

function createContingencyTable(
  annotations: any[],
  annotators: string[],
  tolerance: number = 0
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
      ranges[ranges.length - 1].annotators[annotators[0]] =
        x.annotator == annotators[0] ? 1 : 0;
      ranges[ranges.length - 1].annotators[annotators[1]] =
        x.annotator == annotators[1] ? 1 : 0;
    } else {
      ranges[index].annotators[x.annotator] = 1;
    }
  });

  return ranges;
}

function computeCohensKappa(table: RangeLabel[]): KappaResult {
  const N: number = table.length;

  var agree_1_1: number = 0;
  var agree_0_0: number = 0;
  var disagree_1_0: number = 0;
  var disagree_0_1: number = 0;

  table.forEach((range) => {
    const annotators_row = Object.entries(range.annotators);
    if (annotators_row[0][1] == 1) {
      if (annotators_row[1][1] == 1) {
        agree_1_1++;
      } else {
        disagree_1_0++;
      }
    } else {
      if (annotators_row[1][1] == 1) {
        disagree_0_1++;
      } else {
        agree_0_0++;
      }
    }
  });

  const p1: number =
    ((agree_1_1 + disagree_1_0) * (agree_1_1 + disagree_0_1)) / (N * N);
  const p2: number =
    ((agree_0_0 + disagree_0_1) * (agree_0_0 + disagree_1_0)) / (N * N);

  const pe: number = p1 + p2;

  const po = (agree_1_1 + agree_0_0) / N;

  const kappa: number = (po - pe) / (1 - pe);

  return {
    po: po,
    pe: pe,
    result: kappa,
    table: table,
    variant: "Cohens",
  } as KappaResult;
}
