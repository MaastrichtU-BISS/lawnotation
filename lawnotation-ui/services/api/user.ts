import { User } from "@/types/user";

export default {

  findByEmail: async (email: string, columns = "id") => {
    //
  },

  findUsersByTask: async (task_id: string) => {
    //
  },

  me: async () => {
    const me = await useFetch<User>('/api/auth/me');
    return me.data.value;
  }
  
};
