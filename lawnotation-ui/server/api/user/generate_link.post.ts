import { serverSupabaseServiceRole } from "#supabase/server";
export default eventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event);
  const body = await readBody(event);
  const { data, error } = await client.auth.admin.generateLink({
    type: "magiclink",
    email: body.email,
    // options: { redirectTo: body.redirectTo },
  });
  return { data, error };
});
