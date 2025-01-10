import type { Context } from "../context";

export const publicationViewerAuthorizer = async (
  publication_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await ctx.supabase
    .from("publications")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("id", publication_id)
    .eq("editor_id", user_id);

  if(editor.count) return true;

  const everyone = await ctx.supabase
    .from("publications")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("id", publication_id)
    .eq("status", "published");

    return everyone.count! > 0;
};

export const publicationEditorAuthorizer = async (
  publication_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await ctx.supabase
    .from("publications")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("id", publication_id)
    .eq("editor_id", user_id);

  return editor.count! > 0;
};