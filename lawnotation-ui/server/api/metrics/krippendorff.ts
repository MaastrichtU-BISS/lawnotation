import {
  RangeLabel,
  createContingencyTable,
  MetricResult,
} from "~/utils/metrics";

export default eventHandler(async (event) => {
  const data = await readBody(event);
  const agreement_table = createContingencyTable(
    data.annotations,
    data.annotators,
    data.tolerance
  );
  return computeKrippendorff(agreement_table);
});

function computeKrippendorff(table: RangeLabel[]) {
  let pa: number = 0;
  let sum_zeros: number = 0;
  let sum_ones: number = 0;
  var n: number = Object.entries(table[0].annotators).length;
  var N: number = table.length;
  var nN: number = n * N;

  table.forEach((a) => {
    sum_zeros += a.zeros;
    sum_ones += a.ones;
    const pai0 = (a.zeros * (a.zeros - 1)) / (n * (n - 1));
    const pai1 = (a.ones * (a.ones - 1)) / (n * (n - 1));
    const pai = pai0 + pai1;
    pa += pai;
  });

  pa /= N;
  pa = pa * (1 - 1 / nN) + 1 / nN;

  let pe: number = (sum_zeros / nN) ** 2 + (sum_ones / nN) ** 2;

  const result: number = (pa - pe) / (1 - pe);

  return {
    name: "krippendorff",
    po: pa,
    pe: pe,
    result: result,
    table: table,
  } as MetricResult;
}
