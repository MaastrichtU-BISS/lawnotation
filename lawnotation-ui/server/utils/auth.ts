import type { H3Event } from "h3";
import { createServerAuth, type ServerAuth, type SessionRecord } from "caselaw-auth/server";
import sql, { type Sql } from "~/server/trpc/db";

/**
 * Sign-in through the shared Keycloak (realm `lawnotation`, which asks for an
 * email and a one-time code). The server holds the session in a signed,
 * httpOnly cookie; the browser never sees a token. See
 * https://github.com/MaastrichtU-BISS/caselaw-auth/blob/main/docs/SERVER_SIDE_AUTH.md
 */

export const SESSION_COOKIE = "lawnotation_session";
export const TX_COOKIE = "lawnotation_auth_tx";
export const SESSION_TTL_SECONDS = 7 * 24 * 3600;

let auth: ServerAuth | null = null;

export function serverAuth(): ServerAuth {
  if (auth) return auth;
  const config = useRuntimeConfig();
  const missing = [
    ["AUTH_ISSUER", config.auth.issuer],
    ["AUTH_CLIENT_ID", config.auth.clientId],
    ["AUTH_SESSION_SECRET", config.auth.sessionSecret],
  ].filter(([, value]) => !value);
  if (missing.length)
    throw createError({
      statusCode: 500,
      message: `Sign-in is not configured: ${missing.map(([name]) => name).join(", ")} missing`,
    });

  auth = createServerAuth({
    issuer: config.auth.issuer,
    clientId: config.auth.clientId,
    clientSecret: config.auth.clientSecret || undefined,
    redirectUri: `${config.public.baseURL}/api/auth/callback`,
    sessionSecret: config.auth.sessionSecret,
    sessionTtlSeconds: SESSION_TTL_SECONDS,
  });
  return auth;
}

/** Secure cookies everywhere except plain-http localhost development. */
export function cookieOptions(maxAgeSeconds: number) {
  const secure = useRuntimeConfig().public.baseURL.startsWith("https://");
  return serverAuth().cookieOptions(maxAgeSeconds, { secure });
}

export type AppUser = {
  id: string;
  email: string;
  role: "editor" | "annotator" | "admin";
  user_metadata: Record<string, any>;
};

type UserRow = {
  id: string;
  email: string;
  role: AppUser["role"];
  metadata: Record<string, any> | null;
};

const toAppUser = (row: UserRow): AppUser => ({
  id: row.id,
  email: row.email,
  role: row.role ?? "editor",
  user_metadata: row.metadata ?? {},
});

/**
 * The users row for a Keycloak account, created or linked on the way.
 *
 * 1. A row already linked to this account (oidc_sub) is the user.
 * 2. Otherwise the row with the same email, which is then linked: an annotator
 *    invited before they signed in, an existing user (after the data move)
 *    signing in through Keycloak for the first time, or a user whose Keycloak
 *    account was recreated. The realm only lets someone in after they typed a
 *    code sent to that address, so the email is proof of ownership.
 * 3. Otherwise a new editor, as Supabase's handle_new_user() trigger did.
 */
export async function resolveUser(sub: string, email: string): Promise<AppUser> {
  const normalized = email.trim().toLowerCase();
  const [row] = await sql.begin(async (transaction) => {
    // postgres.js types a transaction without the call signature it has at
    // runtime; this restores it.
    const tx = transaction as unknown as Sql;
    const linked = await tx<UserRow[]>`
      update users set last_sign_in_at = now()
      where oidc_sub = ${sub}
      returning id, email, role, metadata`;
    if (linked.length) return linked;

    const claimed = await tx<UserRow[]>`
      update users set oidc_sub = ${sub}, last_sign_in_at = now()
      where lower(email) = ${normalized}
      returning id, email, role, metadata`;
    if (claimed.length) return claimed;

    return tx<UserRow[]>`
      insert into users (email, oidc_sub, last_sign_in_at)
      values (${normalized}, ${sub}, now())
      returning id, email, role, metadata`;
  });
  return toAppUser(row!);
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const [row] = await sql<UserRow[]>`
    select id, email, role, metadata from users where id = ${id}`;
  return row ? toAppUser(row) : null;
}

export async function readSession(event: H3Event): Promise<SessionRecord | null> {
  return serverAuth().unsealSession(getCookie(event, SESSION_COOKIE));
}

/**
 * The signed-in user of a request, read fresh from the database so that a
 * role change or a metadata update shows at once. Cached on the event.
 */
export async function getSessionUser(event: H3Event): Promise<AppUser | null> {
  if (event.context.authUser !== undefined) return event.context.authUser;
  let user: AppUser | null = null;
  const session = await readSession(event);
  if (session && typeof session.appUserId === "string")
    user = await findUserById(session.appUserId);
  event.context.authUser = user;
  return user;
}

/** Only same-site paths, so the login route can't be used as an open redirect. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//"))
    return "/";
  return value;
}
