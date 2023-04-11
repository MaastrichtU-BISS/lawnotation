import { createClient } from "@supabase/supabase-js";

export type User = {
  email: string,
  password: string
}

export const useUserApi = () => {  
  const config = useRuntimeConfig();
  const supabase = createClient(config.apiUrl, config.apiAnonKey);

  const signIn = async (email: string, password: string): Promise<any> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    })
    if (error)
      throw Error(`Error in signIn: ${error.message}`)
    else
      return data;
  };

  const signOut = async (): Promise<boolean> => {
    const { error } = await supabase.auth.signOut()
    if (error)
      throw Error(`Error in signOut: ${error.message}`)
    else
      return true;
  };

  return {signIn, signOut}
}