import { User } from "@/types/user";
import crud_data from "./common/crud.supabase";
import createSupabaseClient from "./common/client.supabase";

const client = createSupabaseClient();

export const userDataService = {
  ...crud_data("users"),

  findByEmail: async (email: string, columns = "id"): Promise<any> => {
    const { data, error } = await client
      .from("users")
      .select(columns)
      .eq("email", email)
      .single();

    if (error) throw Error(`Error in inviteUser: ${error.message}`);
    else return data;
  },

  findUsersByTask: async (task_id: string) => {
    const { data, error } = await client
      .from("users")
      .select("email, assignment:assignments!inner(task_id)")
      .eq("assignments.task_id", task_id);

    if (error) throw Error(`Error in findUsersByTask: ${error.message}`);
    else return data;
  },

  getEmail: async (id: string) => {
    const { data, error } = await client
      .from("users")
      .select("email")
      .eq("id", id)
      .single();

    if (error) throw Error(`Error in getEmail: ${error.message}`);
    else return data.email;
  },

  // TODO: move this frontend endpoint to respective API service
  inviteUser: async (email: string, redirectTo: string) => {
    const user = await $fetch("/api/user/invite", {
      method: "POST",
      body: JSON.stringify({ email: email, redirectTo: redirectTo }),
    });

    return user;
  }
};

export default userDataService;
