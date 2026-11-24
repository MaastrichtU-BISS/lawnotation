import type { Context } from "../context";

export const documentEditorAuthorizer = async (
  document_id: number,
  user_id: string,
  ctx: Context
) => {
  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1
      from documents d
      join projects p on p.id = d.project_id
      where d.id = ${document_id} and p.editor_id = ${user_id}
    ) as ok`;
  return ok;
}

export const documentEditorOrAnnotatorAuthorizer = async (
  document_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await documentEditorAuthorizer(document_id, user_id, ctx);
  if (editor) return true;

  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1 from assignments
      where document_id = ${document_id} and annotator_id = ${user_id}
    ) as ok`;
  return ok;
};
