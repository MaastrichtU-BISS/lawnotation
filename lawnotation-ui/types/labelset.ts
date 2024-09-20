export type Labelset = {
  id: number;
  name: string;
  desc: string;
  editor_id: string;
  labels: Label[];
};

export type Label = {
  name: string;
  color: string;
}

export type LsLabels =Label[];