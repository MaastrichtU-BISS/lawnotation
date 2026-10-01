export type RelationDirection = "bi" | "left" | "right"
export type RelationLabel =  
  | "Is a"
  | "Has a"
  | "Belongs to"
  | "Implies"
  | "Depends on"
  | "Related to"
  | "Is not"
  | "Part of"

export type AnnotationRelation = {
  id: number,
  from_id: number,
  to_id: number,
  direction: RelationDirection,
  labels: RelationLabel[]
}
