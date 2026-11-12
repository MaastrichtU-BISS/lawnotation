import type { Context } from "../context";

export const labelsetEditorOrAnnotatorAuthorizer = async (
  labelset_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await ctx.supabase
    .from("labelsets")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("id", labelset_id)
    .or(`editor_id.eq.${user_id},editor_id.is.null`);

  if (editor.count) return true;

  // An annotator may read the labelsets of the tasks they annotate: a
  // task's own labelset and, for a hybrid task, its document labelset.
  const { data: tasks } = await ctx.supabase
    .from("tasks")
    .select("id")
    .or(`labelset_id.eq.${labelset_id},document_labelset_id.eq.${labelset_id}`);
  if (!tasks?.length) return false;

  const annotator = await ctx.supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .in(
      "task_id",
      tasks.map((t) => t.id)
    )
    .eq("annotator_id", user_id);

  return annotator.count! > 0;
  // return true;
};