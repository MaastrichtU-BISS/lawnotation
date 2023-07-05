import { Database } from '@/types/supabase'

// TODO: turn this file into singleton

export const createSupabaseClient = () => {
  const client = useSupabaseClient<Database>();
  return client;
}

export default createSupabaseClient;