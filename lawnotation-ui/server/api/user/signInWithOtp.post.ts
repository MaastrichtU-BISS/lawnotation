import { serverSupabaseClient } from "#supabase/server";
export default eventHandler(async (event) => {
  const client = serverSupabaseClient(event);
  const body = await readBody(event);
  const login = await client.auth.signInWithOtp({
    email: body.email,
    options: { emailRedirectTo: body.redirectTo },
  });
  if (login.error) return { error: login.error };

  const user = await client
    .from("users")
    .select()
    .eq("email", body.email)
    .single();
  return { user: user.data };
});
