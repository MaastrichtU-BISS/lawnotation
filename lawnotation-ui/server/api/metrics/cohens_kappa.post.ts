import {
  type RangeLabel,
  type MetricResult,
  newEmptyMetricResult,
  createContingencyTable,
} from "~/utils/metrics";

export default eventHandler(async (event) => {
  const data = await readBody(event);
  if (data.annotators.length != 2) {
    return newEmptyMetricResult("cohens_kappa");
  }
  const table = createContingencyTable(
    data.annotations,
    data.annotators,
    data.tolerance,
    data.contained
  );
  return computeCohensKappa(table);
});

function computeCohensKappa(table: RangeLabel[]): MetricResult {
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

  const result: number = (po - pe) / (1 - pe);

  return {
    name: "cohens_kappa",
    po: po,
    pe: pe,
    result: result,
    table: table,
  } as MetricResult;
}
