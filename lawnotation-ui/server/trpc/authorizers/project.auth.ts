import type { Context } from "../context";

export const projectEditorAuthorizer = async (project_id: number, user_id: string, ctx: Context) => {
  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1 from projects where id = ${project_id} and editor_id = ${user_id}
    ) as ok`;
  return ok;
}
