import type { Context } from "../context";
import { isPublicationEditor, isPublicationViewer } from "~/server/db/queries/publications";

export const publicationViewerAuthorizer = async (
  publication_id: number,
  user_id: string,
  ctx: Context
) => isPublicationViewer(ctx.sql, publication_id, user_id);

export const publicationEditorAuthorizer = async (
  publication_id: number,
  user_id: string,
  ctx: Context
) => isPublicationEditor(ctx.sql, publication_id, user_id);
