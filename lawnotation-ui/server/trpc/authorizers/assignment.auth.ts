import type { Context } from "../context";

export const assignmentEditorAuthorizer = async (
  assignment_id: number,
  user_id: string,
  ctx: Context
) => {
  const query = ctx.supabase
    .from("assignments")
    .select("*, task:tasks!inner(id, project:projects!inner(editor_id))", {
      count: "exact",
      head: true,
    })
    .eq("id", assignment_id);

  const editor = await query.eq("tasks.projects.editor_id", user_id);

  return editor.count === 1;
};

export const assignmentEditorOrAnnotatorAuthorizer = async (
  assignment_id: number,
  user_id: string,
  ctx: Context
) => {
  const baseQuery = () => {
    return ctx.supabase
      .from("assignments")
      .select("*, task:tasks!inner(id, project:projects!inner(editor_id))", {
        count: "exact",
        head: true,
      })
      .eq("id", assignment_id);
  }

  const editor = await baseQuery().eq("tasks.projects.editor_id", user_id);
  const annotator = await baseQuery().eq("annotator_id", user_id);

  return editor.count === 1 || annotator.count === 1;
};
