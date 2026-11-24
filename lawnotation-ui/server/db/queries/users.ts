import type { Sql } from "~/server/db/client";
import type { User } from "~/types";

/** A user as the session needs it. */
export type SessionUserRow = {
  id: string;
  email: string;
  role: "editor" | "annotator" | "admin";
  metadata: Record<string, any> | null;
};

/** The user with this id, as the session needs it, or undefined. */
export async function sessionUserById(sql: Sql, id: string) {
  const [row] = await sql<SessionUserRow[]>`
    select id, email, role, metadata from users where id = ${id}`;
  return row;
}

/** Records a sign-in of the user linked to a Keycloak account; no rows if none is. */
export function signInLinkedUser(sql: Sql, sub: string) {
  return sql<SessionUserRow[]>`
    update users set last_sign_in_at = now()
    where oidc_sub = ${sub}
    returning id, email, role, metadata`;
}

/** Links the user with this (lowercased) email to a Keycloak account and records the sign-in; no rows if there is none. */
export function signInUserByEmail(sql: Sql, sub: string, email: string) {
  return sql<SessionUserRow[]>`
    update users set oidc_sub = ${sub}, last_sign_in_at = now()
    where lower(email) = ${email}
    returning id, email, role, metadata`;
}

/** Inserts a user linked to a Keycloak account, signed in now. */
export function insertSignedInUser(sql: Sql, sub: string, email: string) {
  return sql<SessionUserRow[]>`
    insert into users (email, oidc_sub, last_sign_in_at)
    values (${email}, ${sub}, now())
    returning id, email, role, metadata`;
}

/** Sets the invited-to task in a user's metadata to null. */
export function clearInviteMetadata(sql: Sql, userId: string) {
  return sql`
    update users
    set metadata = metadata || '{"assigned_task_id": null}'::jsonb
    where id = ${userId}`;
}

/** Sets whether a user has the guidance on, in their metadata. */
export function setGuidanceStatus(sql: Sql, userId: string, status: boolean) {
  return sql`
    update users
    set metadata = metadata || jsonb_build_object('guidanceStatus', ${status}::boolean)
    where id = ${userId}`;
}

/** The users with this id (none or one). */
export function usersWithId(sql: Sql, id: string) {
  return sql<User[]>`select id, email, role from users where id = ${id}`;
}

/** The users with this email (none or one). */
export function usersWithEmail(sql: Sql, email: string) {
  return sql<User[]>`select id, email, role from users where email = ${email}`;
}

/** The email of the users with this id (none or one). */
export function emailsOfUserId(sql: Sql, id: string) {
  return sql<{ email: string | null }[]>`select email from users where id = ${id}`;
}

/** One row per annotator of a task: their email and their assignments' task ids. */
export function annotatorsWithAssignmentsOfTask(sql: Sql, taskId: number) {
  return sql<{ email: string | null; assignment: { task_id: number }[] }[]>`
    select u.email, json_agg(json_build_object('task_id', a.task_id)) as assignment
    from users u
    join assignments a on a.annotator_id = u.id
    where a.task_id = ${taskId}
    group by u.id, u.email`;
}
