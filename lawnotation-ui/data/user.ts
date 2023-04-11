import { createClient } from "@supabase/supabase-js";

export type User = {
  email: string,
  password: string
}