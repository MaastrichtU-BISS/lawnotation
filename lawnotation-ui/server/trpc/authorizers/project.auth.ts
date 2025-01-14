import type { Context } from "../context";

export const projectEditorAuthorizer = async (project_id: number, user_id: string, ctx: Context) => {
  const { count } = await ctx.supabase
    .from("projects")
    .select('*', {count: 'exact', head: true})
    .eq('id', project_id)
    .eq('editor_id', user_id);

  return count === 1
}
