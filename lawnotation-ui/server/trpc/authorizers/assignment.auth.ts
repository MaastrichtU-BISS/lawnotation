import type { Context } from "../context";

export const assignmentEditorAuthorizer = async (
  assignment_id: number,
  user_id: string,
  ctx: Context
) => {
  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from assignments a
      join tasks t on t.id = a.task_id
      join projects p on p.id = t.project_id
      where a.id = ${assignment_id} and p.editor_id = ${user_id}
    ) as ok`;
  return ok;
};

export const assignmentEditorOrAnnotatorAuthorizer = async (
  assignment_id: number,
  user_id: string,
  ctx: Context
) => {
  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from assignments a
      join tasks t on t.id = a.task_id
      join projects p on p.id = t.project_id
      where a.id = ${assignment_id}
        and (p.editor_id = ${user_id} or a.annotator_id = ${user_id})
    ) as ok`;
  return ok;
};

// One query for any number of assignments: checking them one by one made a
// bulk annotation insert slow enough to time out at the gateway. True when
// every distinct id exists (with a task in a project) and each one is
// annotated by the user or belongs to a project the user edits.
export const assignmentsEditorOrAnnotatorAuthorizer = async (
  assignment_ids: number[],
  user_id: string,
  ctx: Context
) => {
  const ids = [...new Set(assignment_ids)];
  if (!ids.length) return true;

  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select count(*) = ${ids.length} as ok
    from assignments a
    join tasks t on t.id = a.task_id
    join projects p on p.id = t.project_id
    where a.id = any(${ids}::bigint[])
      and (a.annotator_id = ${user_id} or p.editor_id = ${user_id})`;
  return ok;
};
