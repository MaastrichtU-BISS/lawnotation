import { createPkcePair, randomToken } from "caselaw-auth/server";
import { TX_COOKIE, cookieOptions, safeReturnTo, serverAuth } from "~/server/utils/auth";

/** Starts a sign-in: remembers where to go back to, then hands over to Keycloak. */
export default defineEventHandler(async (event) => {
  const auth = serverAuth();
  const query = getQuery(event);
  const { verifier, challenge } = await createPkcePair();
  const state = randomToken();

  // state and verifier have to survive the round trip without being readable
  // by page script: a short-lived, signed, httpOnly cookie.
  const tx = await auth.sealSession(
    {
      user: { id: "pending", email: null, name: null },
      roles: [],
      expiresAt: Math.floor(Date.now() / 1000) + 600,
      state,
      verifier,
      returnTo: safeReturnTo(query.returnTo),
    },
    TX_COOKIE
  );
  setCookie(event, TX_COOKIE, tx, cookieOptions(600));

  const url = new URL(await auth.authorizationUrl({ state, codeChallenge: challenge }));
  // Prefill the realm's email step, e.g. from an invitation link.
  if (typeof query.email === "string" && query.email) url.searchParams.set("login_hint", query.email);
  return sendRedirect(event, url.toString());
});
