/** What the metrics page's label filters ask of a hybrid task's annotations. */
export type KindFilters = {
  labels?: string[];
  document_labels?: string[];
  no_span_labels?: boolean;
  no_document_labels?: boolean;
};

/**
 * A PostgREST in-list. Every value is quoted, so a label holding a comma,
 * parenthesis or quote stays one value.
 */
export const inList = (values: readonly string[]): string =>
  `(${values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")})`;

/**
 * The `or` filter for a hybrid task, where spans and document tags each
 * answer to their own label filter. `null` means no filter, and "nothing"
 * means both kinds were set to "None".
 */
export function hybridKindFilter(filters: KindFilters): string | null | "nothing" {
  const side = (kind: "span" | "document", none: boolean | undefined, labels: string[] | undefined) => {
    if (none) return undefined;
    return labels?.length ? `and(kind.eq.${kind},label.in.${inList(labels)})` : `kind.eq.${kind}`;
  };
  const span = side("span", filters.no_span_labels, filters.labels);
  const document = side("document", filters.no_document_labels, filters.document_labels);
  if (!span && !document) return "nothing";
  if (span === "kind.eq.span" && document === "kind.eq.document") return null;
  return [span, document].filter(Boolean).join(",");
}
