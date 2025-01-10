import type { AuthorizerDefinition } from ".";
import type { Context } from "../context";

export const annotationEditorOrAnnotatorAuthorizer: AuthorizerDefinition = async (
  annotation_id: number,
  user_id: string,
  ctx: Context
) => {
  const baseQuery = () => {
    return ctx.supabase
      .from("annotations")
      .select("*, assignment:assignments!inner(id, task:tasks!inner(id, project:projects!inner(editor_id)))", {
        count: "exact",
        head: true,
      })
      .eq("id", annotation_id);
  }

  const editor = await baseQuery().eq("assignments.tasks.projects.editor_id", user_id);
  if (editor.count === 1) return true;

  const annotator = await baseQuery().eq("assignments.annotator_id", user_id);
  return annotator.count === 1;
};
