import { serverSupabaseClient } from '#supabase/server'
// import { createSupabaseClient } from '@nuxtjs/supabase/dist/runtime/utils/client';

export default eventHandler(async (event) => {
  const client = serverSupabaseClient(event)
  const body = await readBody(event)
  const login = await client.auth.signInWithOtp({
    email: body.email,
    options: body.redirectTo ? { emailRedirectTo: body.redirectTo } : {}
  })
  
  if (login.error)
    throw createError({statusCode: 401, statusMessage: `Failed to login: ${login.error.message}`})

  return { message: "Magic-link has been sent to your inbox" }
})