export type RelationDirection = "bi" | "left" | "right"
/** Any label the task's labelset offers for relations. */
export type RelationLabel = string;

export type AnnotationRelation = {
  id: number,
  from_id: number,
  to_id: number,
  direction: RelationDirection,
  labels: RelationLabel[]
}
