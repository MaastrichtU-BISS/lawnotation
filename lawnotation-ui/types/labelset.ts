export type LsLabel = { name: string; color: string }

export type LsLabels = LsLabel[];

export type Labelset = {
  id: number;
  name: string;
  desc: string;
  editor_id: string;
  labels: LsLabels;
};