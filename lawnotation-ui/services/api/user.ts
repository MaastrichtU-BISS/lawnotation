import request from "./common/request";
import { User } from "@/types/user";

export const userApiService = {

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

export default userApiService;