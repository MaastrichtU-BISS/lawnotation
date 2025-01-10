import type { Context } from "../context";

export const taskEditorAuthorizer = async (
  task_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await ctx.supabase
    .from("tasks")
    .select("*, project:projects!inner(editor_id)", {
      count: "exact",
      head: true,
    })
    .eq("id", task_id)
    .eq("projects.editor_id", user_id);

  if (editor.count) return true;
  
  return false;
};

export const taskEditorOrAnnotatorAuthorizer = async (
  task_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await taskEditorAuthorizer(task_id, user_id, ctx)
  if (editor) return true;

  const annotator = await ctx.supabase
    .from("assignments")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("task_id", task_id)
    .eq("annotator_id", user_id);

  return annotator.count! > 0;
};
