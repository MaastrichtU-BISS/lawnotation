import { serverSupabaseServiceRole } from '#supabase/server'
export default eventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  const { data, error } = await client.auth.admin.inviteUserByEmail(body.email, body.options)
  return { data }
})