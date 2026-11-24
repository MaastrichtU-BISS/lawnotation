import type { Context } from "../context";
import { isDocumentAnnotator, isDocumentEditor } from "~/server/db/queries/documents";

export const documentEditorAuthorizer = async (
  document_id: number,
  user_id: string,
  ctx: Context
) => isDocumentEditor(ctx.sql, document_id, user_id);

export const documentEditorOrAnnotatorAuthorizer = async (
  document_id: number,
  user_id: string,
  ctx: Context
) => {
  const editor = await documentEditorAuthorizer(document_id, user_id, ctx);
  if (editor) return true;
  return isDocumentAnnotator(ctx.sql, document_id, user_id);
};
