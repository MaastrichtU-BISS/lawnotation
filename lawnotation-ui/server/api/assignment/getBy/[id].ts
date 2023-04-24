import { serverSupabaseServiceRole } from '#supabase/server'
export default eventHandler(async (event) => {
  const client = serverSupabaseServiceRole(event)
  const id  = event.context.params?.id;
  const { data, error } = await client.from("assignments").select().eq("id", id).single();
  return { data }
})