import { z } from "zod";
import { MAX_NAME_LENGTH } from "vue-labelset-editor/model";

// Relation labels come from the task's labelset, so any name a labelset may
// hold is accepted here.
export const ZRelationLabel = z.string().trim().min(1).max(MAX_NAME_LENGTH);
