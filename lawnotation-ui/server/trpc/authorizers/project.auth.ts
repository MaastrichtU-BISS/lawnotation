import type { Context } from "../context";
import { isProjectEditor } from "~/server/db/queries/projects";

export const projectEditorAuthorizer = async (project_id: number, user_id: string, ctx: Context) =>
  isProjectEditor(ctx.sql, project_id, user_id);
