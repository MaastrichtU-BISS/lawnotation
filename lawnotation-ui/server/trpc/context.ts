import type { H3Event } from "h3";
import sql from "./db";
import { getSessionUser } from "~/server/utils/auth";

export async function createContext(event: H3Event) {
  return {
    user: await getSessionUser(event),
    sql,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
