import type { Sql } from "~/server/db/client";
import type { range } from "./helpers";

/** A finished SQL fragment, to be interpolated into a query. */
type Fragment = ReturnType<typeof range>;

/** Which rows of metrics_annotation_rows the metrics page asks for. */
export type MetricsRowFilter = {
  taskId: number;
  documents?: number[];
  annotators?: string[];
  /** Only for tasks that aren't hybrid; hybrid tasks filter through kindCondition. */
  labels?: string[];
  /** A condition on `kind` and `label` (kindFilterSql), for hybrid tasks. */
  kindCondition?: Fragment | null;
};

/** One annotation of the metrics page's list. */
export type MetricsAnnotationRow = {
  id: number;
  start_index: number | null;
  end_index: number | null;
  label: string | null;
  text: string | null;
  confidence_rating: number;
  metadata: string | null;
  kind: string;
  document_id: number | null;
  original_task_id: number | null;
  annotator_email: string | null;
};

function matchingRows(sql: Sql, filter: MetricsRowFilter) {
  return sql`
    task_id = ${filter.taskId}
    ${filter.documents?.length ? sql`AND document_id IN ${sql(filter.documents)}` : sql``}
    ${filter.annotators?.length ? sql`AND annotator_email IN ${sql(filter.annotators)}` : sql``}
    ${filter.labels?.length ? sql`AND label IN ${sql(filter.labels)}` : sql``}
    ${filter.kindCondition ? sql`AND ${filter.kindCondition}` : sql``}
  `;
}

/** A task's annotation level and document labelset (what makes it hybrid), or undefined. */
export async function annotationKindsOfTask(sql: Sql, taskId: number) {
  const [row] = await sql<{ annotation_level: string | null; document_labelset_id: number | null }[]>`
    SELECT annotation_level, document_labelset_id FROM tasks WHERE id = ${taskId}
  `;
  return row;
}

/** One page of the matching annotations, by document, then position. */
export function metricsAnnotationPage(sql: Sql, filter: MetricsRowFilter, limit: number, offset: number) {
  return sql<MetricsAnnotationRow[]>`
    SELECT id, start_index, end_index, label, text, confidence_rating, metadata, kind,
           document_id, original_task_id, annotator_email
    FROM metrics_annotation_rows
    WHERE ${matchingRows(sql, filter)}
    -- Document tags have no position; they head their document's group.
    ORDER BY document_id, start_index NULLS FIRST, end_index, id
    LIMIT ${limit} OFFSET ${offset}
  `;
}

/** How many annotations match, in all and per kind. */
export function metricsAnnotationCounts(sql: Sql, filter: MetricsRowFilter) {
  return sql<{ total: number; spans: number; documents: number }[]>`
    SELECT count(*)::int AS total,
           (count(*) FILTER (WHERE kind = 'span'))::int AS spans,
           (count(*) FILTER (WHERE kind = 'document'))::int AS documents
    FROM metrics_annotation_rows
    WHERE ${matchingRows(sql, filter)}
  `;
}

/** The names of these documents. */
export function documentNames(sql: Sql, documentIds: readonly number[]) {
  return sql<{ id: number; name: string | null }[]>`
    SELECT id, name FROM documents WHERE id IN ${sql(documentIds as number[])}
  `;
}
