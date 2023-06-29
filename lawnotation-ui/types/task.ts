export interface Task {
  id: number,
  name: string,
  desc: string,
  project_id: number,
  labelset_id: number,
  ann_guidelines: string
}