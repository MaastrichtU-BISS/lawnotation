
export type Task = {
    id: number,
    name: string,
    desc: string,
    project_id: number,
    label_id: number,
    ann_guidelines: string
  }
  
  export const useTaskApi = () => {
    const supabase = useSupabaseClient();
    
    // Create
    const createTask = async (fields: Omit<Task, 'id'>): Promise<Task> => {
      const { data, error } = await supabase.from("tasks").insert(fields).select().single();
      if (error)
        throw Error(`Error in createTask: ${error.message}`)
      else
        return data as Task;
    };
  
    // Read
    const findTask = async (id: string): Promise<Task>   => {
      const { data, error } = await supabase.from("tasks").select().eq("id", id).single();
  
      if (error)
        throw Error(`Error in findTask: ${error.message}`)
      else
        return data as Task
    };
  
    // Read all
    const findTasks = async (project_id: string): Promise<Task[]> => {
      const { data, error } = await supabase.from("tasks").select().eq("project_id", project_id);
      
      if (error)
        throw Error(`Error in findTask: ${error.message}`)
      else
        return data as Task[]
    };
  
    // Update
    const updateTask = async (id: string, fields: Partial<Task>): Promise<boolean> => {
      const { data, error } = await supabase.from("tasks").update(fields).eq("id", id);
      
      if (error)
        throw Error(`Error in updateTask: ${error.message}`)
      else
        return true;
    };
  
    // Update
    const deleteTask = async (id: string) => {
      const { data, error } = await supabase.from("tasks").delete().eq("id", id);
  
      if (error)
        throw Error(`Error in deleteTask: ${error.message}`)
      else
        return true;
    };
  
    return {createTask, findTask, findTasks, updateTask, deleteTask}
  }