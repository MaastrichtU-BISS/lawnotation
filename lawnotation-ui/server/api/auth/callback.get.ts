import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  TX_COOKIE,
  cookieOptions,
  resolveUser,
  safeReturnTo,
  serverAuth,
} from "~/server/utils/auth";

/** Keycloak sends the browser back here with a code; exchange it and start the session. */
export default defineEventHandler(async (event) => {
  const auth = serverAuth();
  const query = getQuery(event);
  const tx = await auth.unsealSession(getCookie(event, TX_COOKIE));
  deleteCookie(event, TX_COOKIE, cookieOptions(0));

  if (query.error)
    return sendRedirect(event, `/auth/login?error=${encodeURIComponent(String(query.error))}`);
  if (!tx || typeof query.state !== "string" || tx.state !== query.state || typeof query.code !== "string")
    return sendRedirect(event, "/auth/login?error=expired");

  const tokens = await auth.exchangeCode({ code: query.code, codeVerifier: String(tx.verifier) });
  const claims = await auth.verifyToken(tokens.access_token, { azp: useRuntimeConfig().auth.clientId });
  const email = (claims.email as string | undefined) ?? (claims.preferred_username as string | undefined);
  if (!email || claims.email_verified === false)
    return sendRedirect(event, "/auth/login?error=email");

  const user = await resolveUser(String(claims.sub), email);
  const session = auth.sessionFromClaims(claims, { idToken: tokens.id_token });
  session.appUserId = user.id;
  setCookie(event, SESSION_COOKIE, await auth.sealSession(session, SESSION_COOKIE), cookieOptions(SESSION_TTL_SECONDS));

  return sendRedirect(event, safeReturnTo(tx.returnTo));
});
