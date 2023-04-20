import { serverSupabaseServiceRole } from '#supabase/server'
export default eventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  await client.auth.signInWithOtp({email: body.email, options: { emailRedirectTo: body.redirectTo } })
  const { data } = await client.from("users").select().eq("email", body.email).single();
  return { data }
})