/**
 * The relation labels a task's *document* relations can be given, to hand to
 * legal-annotation-kit's `documentRelationLabels`.
 *
 * In a hybrid task document relations belong to the document labelset: its own
 * `relation_labels` if it has any, else `defaults` (the standard eight, which the
 * caller passes in: the kit's own `RELATION_LABELS`). They never use the span
 * labelset's. For any other task there is no document labelset, so this is
 * undefined and the kit uses the task labelset's relation labels for both, as it
 * always has.
 *
 * Plain data in and out, with no imports, so it also runs under plain Node.
 */
export function documentRelationLabelsOf(
  documentLabelset: { relation_labels?: string[] | null } | undefined,
  defaults: readonly string[]
): string[] | undefined {
  return documentLabelset ? [...(documentLabelset.relation_labels ?? defaults)] : undefined;
}
