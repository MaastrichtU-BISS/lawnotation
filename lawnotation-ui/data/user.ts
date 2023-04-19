
export type User = {
  email: string,
  password: string
}

export const useUserApi = () => {
  const supabase = useSupabaseClient();

  const findByEmail = async (email: string): Promise<any> => {

    const { data, error } = await supabase.from("users").select("id").eq("email", email).single();

    if (error)
        throw Error(`Error in inviteUser: ${error.message}`)
      else
        return data;
  }

  
  const inviteUser = async (email: string, redirectTo: string): Promise<any> => {

    // const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)

    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectTo
      }
    })

    if (error)
        throw Error(`Error in inviteUser: ${error.message}`)
      else
        return data;
  }


  return { inviteUser, findByEmail }
}