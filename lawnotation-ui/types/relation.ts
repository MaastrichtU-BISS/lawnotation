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

export interface AnnotationRelation {
  id: number,
  from_id: number,
  to_id: number,
  ls_to: string,
  ls_from: string,
  direction: RelationDirection,
  labels: RelationLabel[]
}

export interface LSSerializedRelation {
  from_id: string,
  to_id: string,
  direction: RelationDirection,
  labels: RelationLabel[],
  type: string
};