import type { Context } from "../context";

export const documentEditorAuthorizer = async (
  document_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await ctx.supabase
    .from("documents")
    .select("*, project:projects!inner(editor_id)", {
      count: "exact",
      head: true,
    })
    .eq("id", document_id)
    .eq("projects.editor_id", user_id);

  return editor.count === 1
}

export const documentEditorOrAnnotatorAuthorizer = async (
  document_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await documentEditorAuthorizer(document_id, user_id, ctx);
  if (editor) return true;

  const annotator = await ctx.supabase
    .from("assignments")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("document_id", document_id)
    .eq("annotator_id", user_id);

  return annotator.count! > 0;
};