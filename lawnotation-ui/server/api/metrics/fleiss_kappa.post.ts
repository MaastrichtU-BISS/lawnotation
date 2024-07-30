import {
  type RangeLabel,
  createContingencyTable,
  newEmptyMetricResult,
  type MetricResult,
} from "~/utils/metrics";

export default eventHandler(async (event) => {
  const data = await readBody(event);
  if (data.annotators.length < 3) {
    return newEmptyMetricResult("fleiss_kappa");
  }
  const table = createContingencyTable(
    data.annotations,
    data.annotators,
    data.tolerance,
    data.contained
  );
  return computeFleissKappa(table);
});

function computeFleissKappa(table: RangeLabel[]): MetricResult {
  var n: number = Object.entries(table[0].annotators).length;
  var N: number = table.length;
  var nN: number = n * N;

  var po_square_sum: number = 0;
  var pe_0_sum: number = 0;
  var pe_1_sum: number = 0;

  table.forEach((range) => {
    po_square_sum += range.zeros ** 2 + range.ones ** 2;
    pe_0_sum += range.zeros;
    pe_1_sum += range.ones;
  });

  const pe: number = (pe_0_sum / nN) ** 2 + (pe_1_sum / nN) ** 2;

  const po = (1 / (nN * (n - 1))) * (po_square_sum - nN);

  const result: number = (po - pe) / (1 - pe);

  return {
    name: "fleiss_kappa",
    po: po,
    pe: pe,
    result: result,
    table: table,
  } as MetricResult;
}
