import type { Sql } from "~/server/db/client";

/** What the metrics page's label filters ask of a hybrid task's annotations. */
export type KindFilters = {
  labels?: string[];
  document_labels?: string[];
  no_span_labels?: boolean;
  no_document_labels?: boolean;
};

/** One kind of annotation let through, narrowed to `labels` when given. */
export type KindSide = { kind: "span" | "document"; labels: string[] | null };

/**
 * The kinds a hybrid task's annotations may have, where spans and document
 * tags each answer to their own label filter; an annotation passes when it
 * matches any of the returned sides. `null` means no filter, and "nothing"
 * means both kinds were set to "None".
 */
export function hybridKindFilter(filters: KindFilters): KindSide[] | null | "nothing" {
  const side = (kind: KindSide["kind"], none: boolean | undefined, labels: string[] | undefined): KindSide | undefined => {
    if (none) return undefined;
    return { kind, labels: labels?.length ? labels : null };
  };
  const span = side("span", filters.no_span_labels, filters.labels);
  const document = side("document", filters.no_document_labels, filters.document_labels);
  if (!span && !document) return "nothing";
  if (span && document && !span.labels && !document.labels) return null;
  return [span, document].filter((s): s is KindSide => !!s);
}

/**
 * The SQL condition for the sides of hybridKindFilter, on a relation with
 * `kind` and `label` columns: `(kind = 'span' [and label = any(labels)]) or …`.
 */
export function kindFilterSql(sql: Sql, sides: readonly KindSide[]) {
  const conditions = sides.map((s) =>
    s.labels ? sql`(kind = ${s.kind} and label = any(${s.labels}::text[]))` : sql`kind = ${s.kind}`
  );
  return sql`(${conditions.reduce((all, condition) => sql`${all} or ${condition}`)})`;
}
