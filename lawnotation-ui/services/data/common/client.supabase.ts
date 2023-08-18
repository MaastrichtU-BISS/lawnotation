import { Database } from '@/types/supabase'
import { serverSupabaseClient } from '#supabase/server'
// import { createClient } from '@supabase/supabase-js';
import { H3Event } from 'h3'

// TODO: turn this file into singleton

export const createSupabaseClient = (event: H3Event) => {
  // const client = useSupabaseClient<Database>();
  const client = serverSupabaseClient<Database>(event);
  return client;
}

export default createSupabaseClient;