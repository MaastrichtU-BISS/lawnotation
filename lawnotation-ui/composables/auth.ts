import { AuthChangeEvent, AuthSession, AuthUser, createClient } from "@supabase/supabase-js";

export const useAuth = () => {
    const config = useRuntimeConfig();
    const supabase = createClient(config.apiUrl, config.apiAnonKey);

    const session = ref<AuthSession | null>(null);
    
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
    
      const signUp = async (email: string, password: string): Promise<any> => {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password
        })
        if (error)
          throw Error(`Error in signUp: ${error.message}`)
        else
          return data;
      };

    const authUpdated = async (event: AuthChangeEvent, new_session: AuthSession | null) => {
        if ((session.value?.access_token == new_session?.access_token))
            return;
        
        session.value = new_session;
        // console.log(`Your auth changed: ${session.value?.user.email}`, event)
    }
    supabase.auth.onAuthStateChange((event, session) => authUpdated(event, session))

    return {session, authUpdated, signIn, signOut, signUp}
}