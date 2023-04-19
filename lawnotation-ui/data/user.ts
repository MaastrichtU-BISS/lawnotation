
export type User = {
  email: string,
  password: string
}

export const useUserApi = () => {
  const supabase = useSupabaseClient();

  const otpLogin = async (email: string, redirectTo: string): Promise<any> => {
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

  const findByEmail = async (email: string): Promise<any> => {

    const { data, error } = await supabase.from("users").select("id").eq("email", email).single();

    if (error)
        throw Error(`Error in inviteUser: ${error.message}`)
      else
        return data;
  }

  
  const inviteUser = async (email: string, redirectTo: string): Promise<any> => {

    const user = await $fetch('/api/user/invite', {
      method: 'POST',
      body: JSON.stringify({ email: email, options: { emailRedirectTo: redirectTo }})
    })
    
    return user;

  }


  return { inviteUser, findByEmail, otpLogin }
}