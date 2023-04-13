const supabase = useSupabaseClient();

export type User = {
  email: string,
  password: string
}