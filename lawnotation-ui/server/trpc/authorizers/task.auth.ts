import type { Context } from "../context";
import { isTaskAnnotator, isTaskEditor } from "~/server/db/queries/tasks";

export const taskEditorAuthorizer = async (
  task_id: number,
  user_id: string,
  ctx: Context
) => {
  return isTaskEditor(ctx.sql, task_id, user_id);
};

export const taskEditorOrAnnotatorAuthorizer = async (
  task_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await taskEditorAuthorizer(task_id, user_id, ctx)
  if (editor) return true;

  return isTaskAnnotator(ctx.sql, task_id, user_id);
};
