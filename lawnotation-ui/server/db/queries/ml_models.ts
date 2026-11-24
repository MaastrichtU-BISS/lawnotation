import type { Sql } from "~/server/db/client";
import type { MlModel } from "~/types";
import type { Origins } from "~/utils/enums";
import { insertRows, one } from "./helpers";

/** Whether an ML model with this id exists. */
export async function mlModelExists(sql: Sql, id: number) {
  const [{ count }] = await sql<[{ count: number }]>`
    SELECT count(*)::int AS count FROM ml_models WHERE id = ${id}
  `;
  return count === 1;
}

/** The ML model with this id; throws unless there is exactly one. */
export async function mlModelById(sql: Sql, id: number) {
  return one(await sql<MlModel[]>`SELECT * FROM ml_models WHERE id = ${id}`, "mlModelById");
}

/** Every ML model. */
export function mlModels(sql: Sql) {
  return sql<MlModel[]>`SELECT * FROM ml_models`;
}

// What the ML backend's hooks write back (hook.router).

/** An annotation the ML backend predicted. */
export type PredictedAnnotation = {
  label: string;
  assignment_id: number;
  start_index: number;
  end_index: number;
  text: string;
  origin: Origins;
};

/** Inserts predicted annotations, any number of them. */
export async function insertPredictedAnnotations(sql: Sql, annotations: readonly PredictedAnnotation[]) {
  await insertRows(sql, "annotations", annotations);
}

/** Sets the status the ML backend reports on these assignments. */
export async function setAssignmentsStatus(sql: Sql, assignmentIds: readonly number[], status: string) {
  if (!assignmentIds.length) return;
  await sql`
    UPDATE assignments SET status = ${status}
    WHERE id IN ${sql(assignmentIds as number[])}
  `;
}
