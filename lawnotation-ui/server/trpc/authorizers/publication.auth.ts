import type { Context } from "../context";

export const publicationViewerAuthorizer = async (
  publication_id: number,
  user_id: string,
  ctx: Context
) => {
  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1 from publications
      where id = ${publication_id}
        and (editor_id = ${user_id} or status = 'published')
    ) as ok`;
  return ok;
};

export const publicationEditorAuthorizer = async (
  publication_id: number,
  user_id: string,
  ctx: Context
) => {
  const [{ ok }] = await ctx.sql<[{ ok: boolean }]>`
    select exists (
      select 1 from publications
      where id = ${publication_id} and editor_id = ${user_id}
    ) as ok`;
  return ok;
};
