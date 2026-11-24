import type { Context } from "../context";

export const labelsetEditorOrAnnotatorAuthorizer = async (
  labelset_id: number,
  user_id: string,
  ctx: Context
) => {
  // The editor of the labelset, anyone for a labelset without an editor, or
  // an annotator of a task that uses it: a task's own labelset and, for a
  // hybrid task, its document labelset.
  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select
      exists (
        select 1 from labelsets
        where id = ${labelset_id}
          and (editor_id = ${user_id} or editor_id is null)
      )
      or exists (
        select 1
        from tasks t
        join assignments a on a.task_id = t.id
        where (t.labelset_id = ${labelset_id} or t.document_labelset_id = ${labelset_id})
          and a.annotator_id = ${user_id}
      ) as ok`;
  return ok;
};
