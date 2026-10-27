import { effectiveRelationLabels, type Labelset } from "vue-labelset-editor/model";

const sortedNames = (names: string[]) => [...names].sort().join("\n");

// Saved annotations and relations refer to labels by name, so a labelset in
// use may change order and colours but not which names it offers.
export function lockedNamesChanged(before: Labelset, after: Labelset): string | null {
  if (sortedNames(before.labels.map((l) => l.name)) !== sortedNames(after.labels.map((l) => l.name)))
    return "labels can't be added, removed or renamed while tasks use this labelset";
  if (sortedNames(effectiveRelationLabels(before.relation_labels)) !== sortedNames(effectiveRelationLabels(after.relation_labels)))
    return "relation labels can't be added, removed or renamed while tasks use this labelset";
  return null;
}
