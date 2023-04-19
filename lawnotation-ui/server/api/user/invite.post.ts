import { serverSupabaseServiceRole } from '#supabase/server'
export default eventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)
  const body = await readBody(event)
  console.log(body)
  const { data, error } = await client.auth.admin.inviteUserByEmail(body.email, body.options)
  console.log(error)
  console.log('mmm', data)
  return { data }
})