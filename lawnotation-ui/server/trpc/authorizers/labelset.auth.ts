import type { Context } from "../context";
import { labelsetVisibleTo } from "~/server/db/queries/labelsets";

// The editor of the labelset, anyone for a labelset without an editor, or an
// annotator of a task that uses it: a task's own labelset and, for a hybrid
// task, its document labelset.
export const labelsetEditorOrAnnotatorAuthorizer = async (
  labelset_id: number,
  user_id: string,
  ctx: Context
) => labelsetVisibleTo(ctx.sql, labelset_id, user_id);
