export interface Labelset {
  id: string,
  name: string,
  desc: string,
  editor_id: string,
  labels: {name: string, color: string}[]
}

export type LsLabels = Labelset['labels'];