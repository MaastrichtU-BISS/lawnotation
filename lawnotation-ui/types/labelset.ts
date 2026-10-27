export type Labelset = {
  id: number;
  name: string;
  desc: string;
  editor_id: string;
  labels: Label[];
  /** Labels a relation can be given; null means the default eight. */
  relation_labels?: string[] | null;
};

export type Label = {
  name: string;
  color: string;
}
