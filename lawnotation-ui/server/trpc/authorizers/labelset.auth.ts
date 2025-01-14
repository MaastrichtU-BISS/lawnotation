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

  const annotator = await ctx.supabase
    .from("assignments")
    .select("*, task:tasks!inner(labelset_id)", {
      count: "exact",
      head: true,
    })
    .eq("tasks.labelset_id", labelset_id)
    .eq("annotator_id", user_id);

  return annotator.count! > 0;
  // return true;
};