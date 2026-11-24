import type { Context } from "../context";
import {
  isEditorOfAssignment,
  isEditorOrAnnotatorOfAssignment,
  isEditorOrAnnotatorOfAssignments,
} from "~/server/db/queries/assignments";

export const assignmentEditorAuthorizer = async (
  assignment_id: number,
  user_id: string,
  ctx: Context
) => isEditorOfAssignment(ctx.sql, assignment_id, user_id);

export const assignmentEditorOrAnnotatorAuthorizer = async (
  assignment_id: number,
  user_id: string,
  ctx: Context
) => isEditorOrAnnotatorOfAssignment(ctx.sql, assignment_id, user_id);

// One query for any number of assignments: checking them one by one made a
// bulk annotation insert slow enough to time out at the gateway. True when
// every distinct id exists (with a task in a project) and each one is
// annotated by the user or belongs to a project the user edits.
export const assignmentsEditorOrAnnotatorAuthorizer = async (
  assignment_ids: number[],
  user_id: string,
  ctx: Context
) => isEditorOrAnnotatorOfAssignments(ctx.sql, assignment_ids, user_id);
