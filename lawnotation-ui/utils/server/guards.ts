import { H3Event} from 'h3';
import { User } from '~/types/user';

export function userIsAuthenticated(event: H3Event): asserts event is H3Event & { context: { auth: { authenticated: true } } } {
  if (!event.context.auth.authenticated)
    throw createError({statusCode: 403, statusMessage: "Unauthenticated"});
}

export function userHasRole<TRole extends User['role']>(event: H3Event, role: TRole | TRole[]):
  asserts event is H3Event & {
    context: {
      auth: { authenticated: true, user: User & {role: TRole}}
    }
  } {
  userIsAuthenticated(event);

  if (!event.context.auth.user)
    throw createError({statusCode: 500, message: "User not found"});

  const roles: TRole[] = Array.isArray(role) ? role : [role];
  if (!roles.includes(event.context.auth.user.role as TRole))
    throw createError({statusCode: 403, statusMessage: "Unauthorized"});
}