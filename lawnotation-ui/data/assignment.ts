
export type Assignment = {
  id: number,
  annotator_id: string | undefined,
  task_id: number | undefined,
  document_id: number,
  status: string
}

export const useAssignmentApi = () => {
  const supabase = useSupabaseClient();
  
  // Create
  const createAssignment = async (fields: Omit<Assignment, 'id'>): Promise<Assignment> => {
    const { data, error } = await supabase.from("assignments").insert(fields).select().single();
    if (error)
      throw Error(`Error in createAssignment: ${error.message}`)
    else
      return data as Assignment;
  };

  // Create
  const createAssignments = async (fields: Omit<Assignment[], 'id' | "annotator_id">): Promise<Assignment[]> => {
    const { data, error } = await supabase.from("assignments").insert(fields).select();
    if (error)
      throw Error(`Error in createAssignments: ${error.message}`)
    else
      return data as Assignment[];
  };

  // Read
  const findAssignment = async (id: string): Promise<Assignment>   => {
    const { data, error } = await supabase.from("assignments").select().eq("id", id).single();

    if (error)
      throw Error(`Error in findAssignment: ${error.message}`)
    else
      return data as Assignment
  };

  // Read all
  const findAssignmentsByTask = async (task_id: string): Promise<Assignment[]> => {
    const { data, error } = await supabase.from("assignments").select().eq("task_id", task_id);
    
    if (error)
      throw Error(`Error in findAssignment: ${error.message}`)
    else
      return data as Assignment[]
  };

  const findAssignmentsByUser = async (annotator_id: string): Promise<Assignment[]> => {
    const { data, error } = await supabase.from("assignments").select().eq("annotator_id", annotator_id);
    
    if (error)
      throw Error(`Error in findAssignment: ${error.message}`)
    else
      return data as Assignment[]
  };

  const findNextAssignmentsByUserAndTask = async (annotator_id: string, task_id: number): Promise<Assignment> => {
    const { data, error } = await supabase.rpc("next_random_assignment", { a_id: annotator_id, t_id: task_id }).single()

    if (error)
      throw Error(`Error in findNextAssignmentsByUserAndTask: ${error.message}`)
    else
      return data as Assignment
  };

  const countAssignmentsByUserAndTask = async (annotator_id: string, task_id: number): Promise<any> => {
    const pending = await supabase.from("assignments").select("count").eq("annotator_id", annotator_id).eq("task_id", task_id).eq("status", "pending").single();
    const total = await supabase.from("assignments").select("count").eq("annotator_id", annotator_id).eq("task_id", task_id).single();

    return { pending: pending.data?.count, done: total.data?.count - pending.data?.count , total: total.data?.count}
  };

  // Update
  const updateAssignment = async (id: string, fields: Partial<Assignment>): Promise<boolean> => {
    const { data, error } = await supabase.from("assignments").update(fields).eq("id", id);
    
    if (error)
      throw Error(`Error in updateAssignment: ${error.message}`)
    else
      return true;
  };

  // Update
  const deleteAssignment = async (id: string) => {
    const { data, error } = await supabase.from("assignments").delete().eq("id", id);

    if (error)
      throw Error(`Error in deleteAssignment: ${error.message}`)
    else
      return true;
  };

  return {createAssignment, createAssignments, findAssignment, findAssignmentsByTask, findAssignmentsByUser, updateAssignment, deleteAssignment, findNextAssignmentsByUserAndTask, countAssignmentsByUserAndTask}
}