import { serverSupabaseClient } from "#supabase/server";
import { Assignment } from "~/data/assignment";
import {
  DifficultyMetricResult,
  MetricResult,
  newEmptyMetricResult,
} from "~/utils/metrics";

export default eventHandler(async (event) => {
  const data = await readBody(event);

  //ordered by documents
  const assignments = await findAssignmentsByTaskUsersDocuments(
    event,
    data.task_id,
    data.annotators,
    data.documents
  );
  //   [1, 1, 1, 5, 5, 5, 5, 5, 5, 2, 2, 5]

  return computeMetric(
    assignments.map((a) => a.difficulty_rating),
    data.annotators.length,
    5
  );
});

function weightOrdinal(i: number, j: number, q: number): number {
  return 1 - (Math.abs(i - j) * (Math.abs(i - j) + 1)) / 2 / (2 * q);
}

function computeMetric(
  ratings: number[],
  m: number,
  q: number
): DifficultyMetricResult {
  let result = {
    average: 0,
    min: 10 ** 6,
    max: -1 * 100 ** 6,
    total: ratings.length,
    rated: 0,
    unrated: 0,
    krippendorff: undefined,
    values: new Array(q + 1).fill(0),
  } as DifficultyMetricResult;

  let sum: number = 0;
  ratings.map((r) => {
    if (r == 0) result.unrated++;
    else result.rated++;
    result.values[r]++;
    if (r > 0) result.min = Math.min(result.min, r);
    result.max = Math.max(result.max, r);
    sum += r;
  });

  result.average = sum / result.rated;

  result.krippendorff = krippendorff(ratings, m, q, weightOrdinal);
  return result;
}

function krippendorff(
  ratings: number[],
  m: number,
  q: number,
  weightFunc: Function
): MetricResult {
  let result = newEmptyMetricResult("krippendorff");
  let n = ratings.length / m;
  let rating_table: number[][] = [];

  for (let i = 0; i < n; i++) {
    rating_table.push([]);
    let distinct_to_zero: number = 0;
    for (let j = 0; j < m; j++) {
      const diff = ratings[i * m + j];
      rating_table[i].push(diff);
      if (diff != 0) distinct_to_zero++;
    }
    if (distinct_to_zero < 2) rating_table.splice(i, 1);
  }

  n = rating_table.length;
  //   console.log(rating_table);

  let agreement_table: number[][] = [];
  for (let i = 0; i < n; i++) {
    agreement_table.push(new Array(q).fill(0));
    for (let j = 0; j < m; j++) {
      const diff = rating_table[i][j];
      if (diff > 0) agreement_table[i][rating_table[i][j] - 1]++;
    }
  }

  //   console.log(agreement_table);

  let weights_table: number[][] = [];
  for (let i = 0; i < q; i++) {
    weights_table.push(new Array(q).fill(0));
    for (let j = 0; j < q; j++) {
      weights_table[i][j] = weightFunc(i, j, q);
    }
  }

  //   console.log(weights_table);

  let _rik: number[][] = [];
  let ri = [];
  let _r = 0;
  let pi = [];
  let _pa = 0;

  for (let i = 0; i < n; i++) {
    _rik.push(new Array(q).fill(0));
    ri.push(0);
    for (let k = 0; k < q; k++) {
      ri[i] += agreement_table[i][k];
      for (let h = 0; h < q; h++) {
        _rik[i][k] += weights_table[k][h] * agreement_table[i][h];
      }
    }
    _r += ri[i];
  }

  _r /= n;

  for (let i = 0; i < n; i++) {
    pi.push(1 / (_r * (ri[i] - 1)));
    let sum = 0;
    for (let k = 0; k < q; k++) {
      sum += agreement_table[i][k] * (_rik[i][k] - 1);
    }
    pi[i] *= sum;
    _pa += pi[i];
  }

  _pa /= n;

  const e = 1 / (n * _r);

  const pa = _pa * (1 - e) + e;

  let pik = [];
  for (let k = 0; k < q; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += agreement_table[i][k];
    }
    pik.push(e * sum);
  }

  let pe = 0;
  for (let h = 0; h < q; h++) {
    for (let k = 0; k < q; k++) {
      pe += weights_table[h][k] * pik[k];
    }
    pe *= pik[h];
  }

  const ka = (pa - pe) / (1 - pe);

  //   console.log("_rik: ", _rik);
  //   console.log("ri: ", ri);
  //   console.log("_r: ", _r);
  //   console.log("pi: ", pi);
  //   console.log("_pa: ", _pa);
  //   console.log("e: ", e);
  //   console.log("pa: ", pa);
  //   console.log("pik: ", pik);
  //   console.log("pe: ", pe);
  //   console.log("ka: ", ka);

  result.pe = pe;
  result.po = pa;
  result.result = ka;
  result.table = [];
  return result;
}

async function findAssignmentsByTaskUsersDocuments(
  event: any,
  task_id: string,
  annotators_id: string[] = [],
  documents_id: string[] = []
): Promise<Assignment[]> {
  const supabase = serverSupabaseClient(event);
  let query = supabase
    .from("assignments")
    .select("*, user:users!inner(id, email)")
    .eq("task_id", task_id);
  if (annotators_id.length) {
    query = query.in("users.email", annotators_id);
  }
  if (documents_id.length) {
    query = query.in("document_id", documents_id);
  }

  const { data, error } = await query.order("document_id");

  if (error)
    throw Error(
      `Error in findAssignmentsByTaskUsersDocuments: ${error.message}`
    );
  else return data as Assignment[];
}
