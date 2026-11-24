import { SESSION_COOKIE, cookieOptions, readSession, serverAuth } from "~/server/utils/auth";

/** Ends the local session and the Keycloak one (single sign-out). */
export default defineEventHandler(async (event) => {
  const session = await readSession(event);
  deleteCookie(event, SESSION_COOKIE, cookieOptions(0));
  const { baseURL } = useRuntimeConfig().public;
  return sendRedirect(
    event,
    await serverAuth().endSessionUrl({
      idToken: session?.idToken as string | undefined,
      returnTo: `${baseURL}/`,
    })
  );
});
