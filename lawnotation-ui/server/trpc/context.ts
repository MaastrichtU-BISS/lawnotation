import type { inferAsyncReturnType } from '@trpc/server' 
import { H3Event } from 'h3';
// import { serverSupabaseServiceRole } from '#supabase/server';
import { serverSupabaseServiceRole } from '~/node_modules/@nuxtjs/supabase/dist/runtime/server/services';
import type { Database } from '~/types/supabase';
import sql from './db';

function getTokenFromHeader(authHeader: string) {
  if (!authHeader.startsWith('Bearer ') || authHeader.length === 7)
    throw createError({message: 'Access token is not valid'})
  return authHeader.substring(7);
}

export async function createContext(event: H3Event) {
  const authorization = getRequestHeader(event, 'authorization')

  let user = null;
  const supabase = serverSupabaseServiceRole<Database>(event);

  if (authorization) {

    const token = getTokenFromHeader(authorization)

    const getUser = await supabase.auth.getUser(token);
    if (!getUser.error)
      user = getUser.data.user;
  }
  
  return {
    user,
    supabase,
    sql
  }
}

export type Context = inferAsyncReturnType<typeof createContext>