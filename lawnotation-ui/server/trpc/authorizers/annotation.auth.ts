import type { AuthorizerDefinition } from ".";
import type { Context } from "../context";

export const annotationEditorOrAnnotatorAuthorizer: AuthorizerDefinition = async (
  annotation_id: number,
  user_id: string,
  ctx: Context
) => {
  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from annotations an
      join assignments a on a.id = an.assignment_id
      join tasks t on t.id = a.task_id
      join projects p on p.id = t.project_id
      where an.id = ${annotation_id}
        and (p.editor_id = ${user_id} or a.annotator_id = ${user_id})
    ) as ok`;
  return ok;
};
