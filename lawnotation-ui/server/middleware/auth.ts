import { H3Event } from 'h3';
import { serverSupabaseClient } from '#supabase/server'

function getTokenFromHeader(authHeader: string) {
  if (!authHeader.startsWith('Bearer ') || authHeader.length === 7)
    throw createError({message: 'Access token is not valid'})
  return authHeader.substring(7);
}

export default defineEventHandler(async (event: H3Event) => {
  event.context.auth = {
    authenticated: false,
    user: null
  }

  const headers = event.node.req.headers;

  if (headers.authorization) {
    const token = getTokenFromHeader(headers.authorization)
    const supa = serverSupabaseClient(event);
    const getUser = await supa.auth.getUser(token);
    if (getUser.error)
      throw createError({message: `Authenticated user not found: ${ getUser.error.message }`})
    
    const user = getUser.data.user;

    event.context.auth.authenticated = true;
    event.context.auth.user = user;
  }
})