import type { Context } from "../context";

export const taskEditorAuthorizer = async (
  task_id: number,
  user_id: string,
  ctx: Context
) => {
  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from tasks t
      join projects p on p.id = t.project_id
      where t.id = ${task_id} and p.editor_id = ${user_id}
    ) as ok`;
  return ok;
};

export const taskEditorOrAnnotatorAuthorizer = async (
  task_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await taskEditorAuthorizer(task_id, user_id, ctx)
  if (editor) return true;

  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1 from assignments
      where task_id = ${task_id} and annotator_id = ${user_id}
    ) as ok`;
  return ok;
};
