import { User } from "@/types/user";
import request from "../common/request.api";

export default {

  findByEmail: async (email: string, columns = "id") => {
    //
  },

  findByTask: async (task_id: string) => {
    //
  },

  me: async () => {
    const me = await request<User>('/api/user/me');
    return me;
  }
  
};
