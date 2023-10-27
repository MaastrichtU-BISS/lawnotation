/**
 * This is your entry point to setup the root configuration for tRPC on the server.
 * - `initTRPC` should only be used once per app.
 * - We export only the functionality that we use so we can enforce which base procedures should be used
 *
 * Learn how to create protected base procedures and other things below:
 * @see https://trpc.io/docs/v10/router
 * @see https://trpc.io/docs/v10/procedures
 */
import { TRPCError, initTRPC } from "@trpc/server";
import { ZodError } from "zod";
import { Context } from "~/server/trpc/context";

const t = initTRPC.context<Context>().create({
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        ...(error.code === "BAD_REQUEST" && error.cause instanceof ZodError
          ? { zodErrors: error.cause.flatten() }
          : {}),
      },
    };
  },
});

/**
 * Middlewares
 */
const isAuthenticated = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

type MiddlewareOptsParam = Parameters<Parameters<typeof middleware>[0]>[0];
export const authorizer = async <T extends MiddlewareOptsParam>(
  opts: T,
  resolver: undefined | ((opts: T) => Promise<boolean>)
) => {
  try {
    let authorized = false;
    if (opts.ctx.user?.role == "admin") authorized = true;
    else if (resolver) authorized = await resolver(opts);

    if (!authorized)
      // throw new TRPCError({ code: 'NOT_FOUND' })
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Sorry, the content you are looking for is not available.",
      });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    } else {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to authorize request",
      });
    }
  }

  return opts.next();
};

/**
 * Procedures
 **/
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const router = t.router;
export const middleware = t.middleware;
