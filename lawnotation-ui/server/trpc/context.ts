import type { TRPCError, inferAsyncReturnType } from '@trpc/server' 
import { H3Event } from 'h3';
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server';
import type { Database } from '~/types/supabase';
import postgres from 'postgres'

function getTokenFromHeader(authHeader: string) {
  if (!authHeader.startsWith('Bearer ') || authHeader.length === 7)
    throw createError({message: 'Access token is not valid'})
  return authHeader.substring(7);
}

export async function createContext(event: H3Event) {
  const authorization = getRequestHeader(event, 'authorization')

  let user = null;
  const supabase = await serverSupabaseServiceRole<Database>(event);

  if (!process.env.DATABASE_URL)
    throw Error("DATABASE_URL is not defined")
  const sql = postgres(process.env.DATABASE_URL);

  if (authorization) {

    const token = getTokenFromHeader(authorization)

    const getUser = await supabase.auth.getUser(token);
    if (!getUser.error)
      // throw new TRPCError({code: 'UNAUTHORIZED'});
      // throw createError({message: `Authenticated user not found: ${ getUser.error.message }`})
      user = getUser.data.user;
  }

  // hooksKey = null;
  // if (it haskey in header) { 
  //   hooksKey = from header
  // }
  
  return {
    user,
    supabase,
    sql
  }
}

export type Context = inferAsyncReturnType<typeof createContext>