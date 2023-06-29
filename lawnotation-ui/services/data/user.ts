import { AuthError } from "@supabase/supabase-js";
import { User } from "@/types/user";

export const useUserApi = () => {
  const supabase = useSupabaseClient();

  const findByEmail = async (email: string, columns = "id"): Promise<any> => {
    const { data, error } = await supabase
      .from("users")
      .select(columns)
      .eq("email", email)
      .single();

    if (error) throw Error(`Error in inviteUser: ${error.message}`);
    else return data;
  };

  const findUsersByTask = async (task_id: string): Promise<User[]> => {
    const { data, error } = await supabase
      .from("users")
      .select("email, assignment:assignments!inner(task_id)")
      .eq("assignments.task_id", task_id);

    if (error) throw Error(`Error in findUsersByTask: ${error.message}`);
    else return data as Promise<User[]>;
  };

  const getEmail = async (id: string): Promise<any> => {
    const { data, error } = await supabase
      .from("users")
      .select("email")
      .eq("id", id)
      .single();

    if (error) throw Error(`Error in inviteUser: ${error.message}`);
    else return data.email;
  };

  const inviteUser = async (
    email: string,
    redirectTo: string
  ): Promise<any> => {
    const user = await $fetch("/api/user/invite", {
      method: "POST",
      body: JSON.stringify({ email: email, redirectTo: redirectTo }),
    });

    return user;
  };

  return { inviteUser, findByEmail, findUsersByTask, otpLogin, getEmail };
};
