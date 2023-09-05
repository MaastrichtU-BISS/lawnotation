export interface Labelset {
  id: number,
  name: string,
  desc: string,
  editor_id: string,
  labels: {name: string, color: string}[]
}

export type LsLabels = Labelset['labels'];