import type { AuthorizerDefinition } from ".";
import type { Context } from "../context";
import { isAnnotationEditorOrAnnotator } from "~/server/db/queries/annotations";

export const annotationEditorOrAnnotatorAuthorizer: AuthorizerDefinition = async (
  annotation_id: number,
  user_id: string,
  ctx: Context
) => isAnnotationEditorOrAnnotator(ctx.sql, annotation_id, user_id);
