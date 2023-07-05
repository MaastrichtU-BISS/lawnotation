import { Task } from "@/types/task"
import crud_data from "./common/crud.supabase";
import createSupabaseClient from "./common/client.supabase";

const client = createSupabaseClient();

export const taskDataService = {
  ...crud_data("tasks"),

  getAllAnnotatorTasks: async (annotator_id: string): Promise<Task[]> => {
    const { data, error } = await client.rpc("get_all_annotator_tasks", { a_id: annotator_id });
    if (error)
      throw Error(`Error in getAllAnnotatorTasks: ${error.message}`)
    else
      return data as Task[]
  }
}

export default taskDataService