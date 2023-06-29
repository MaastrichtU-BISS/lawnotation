export interface AnnotationRelation {
  id: number,
  from_id: number,
  to_id: number,
  ls_to: string,
  ls_from: string,
  direction: string,
  labels: string[]
}

export interface LSSerializedRelation {
  from_id: string,
  to_id: string,
  direction: string,
  labels: string[],
  type: string
};