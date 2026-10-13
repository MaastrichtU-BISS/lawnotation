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

// One query for any number of assignments: checking them one by one made a
// bulk annotation insert slow enough to time out at the gateway.
export const assignmentsEditorOrAnnotatorAuthorizer = async (
  assignment_ids: number[],
  user_id: string,
  ctx: Context
) => {
  const ids = [...new Set(assignment_ids)];
  const { data, error } = await ctx.supabase
    .from("assignments")
    .select("id, annotator_id, task:tasks!inner(project:projects!inner(editor_id))")
    .in("id", ids);

  if (error || !data || data.length !== ids.length) return false;

  return data.every(
    (ass: any) =>
      ass.annotator_id === user_id || ass.task?.project?.editor_id === user_id
  );
};
