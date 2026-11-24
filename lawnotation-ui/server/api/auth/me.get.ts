import { getSessionUser } from "~/server/utils/auth";

/** The signed-in user (id, email, role, metadata), or null. */
export default defineEventHandler(async (event) => {
  setHeader(event, "cache-control", "no-store");
  return await getSessionUser(event);
});
