export type Assignment = {
  id: number;
  annotator_id: string;
  task_id: number;
  document_id: number;
  status: string;
  seq_pos: number;
  difficulty_rating: number;
};

export type AssignmentTableData = {
  id: number;
  task_id: number;
  annotator: {
    id: string;
    email: string;
  };
  document: {
    id: number;
    name: string;
    source: string;
    // full_text: string
  };
  status: string;
  seq_pos: number;
  difficulty_rating: number;
};

export const useAssignmentApi = () => {
  const supabase = useSupabaseClient();

  // Create
  const createAssignment = async (
    fields: Omit<Assignment, "id">
  ): Promise<Assignment> => {
    const { data, error } = await supabase
      .from("assignments")
      .insert(fields)
      .select()
      .single();
    if (error) throw Error(`Error in createAssignment: ${error.message}`);
    else return data as Assignment;
  };

  // Create
  const createAssignments = async (
    fields: Omit<Assignment, "id" | "annotator_id" | "status">[]
  ): Promise<Assignment[]> => {
    const { data, error } = await supabase
      .from("assignments")
      .insert(fields)
      .select();
    if (error) throw Error(`Error in createAssignments: ${error.message}`);
    else return data as Assignment[];
  };

  // Read
  const findAssignment = async (id: string): Promise<Assignment> => {
    const { data, error } = await supabase
      .from("assignments")
      .select()
      .eq("id", id)
      .single();

    if (error) throw Error(`Error in findAssignment: ${error.message}`);
    else return data as Assignment;
  };

  // Read all
  const getCountByUser = async (editor_id: string): Promise<never> => {
    const { data, error } = await supabase
      .rpc("get_count_assignments", { e_id: editor_id })
      .single();

    if (error) throw Error(`Error in getCountByUser: ${error.message}`);
    else return data;
  };

  // Read all
  const findAssignmentsByTask = async (
    task_id: string
  ): Promise<Assignment[]> => {
    const { data, error } = await supabase
      .from("assignments")
      .select()
      .eq("task_id", task_id);

    if (error) throw Error(`Error in findAssignment: ${error.message}`);
    else return data as Assignment[];
  };

  const findAssignmentsByUserTaskSeq = async (
    annotator_id: string,
    task_id: string,
    seq_pos: number
  ): Promise<Assignment> => {
    const { data, error } = await supabase
      .from("assignments")
      .select()
      .eq("task_id", task_id)
      .eq("annotator_id", annotator_id)
      .eq("seq_pos", seq_pos)
      .single();

    if (error)
      throw Error(`Error in findAssignmentsByUserTaskSeq: ${error.message}`);
    else return data as Assignment;
  };

  const findAssignmentsByUser = async (
    annotator_id: string
  ): Promise<Assignment[]> => {
    const { data, error } = await supabase
      .from("assignments")
      .select()
      .eq("annotator_id", annotator_id);

    if (error) throw Error(`Error in findAssignment: ${error.message}`);
    else return data as Assignment[];
  };

  const findNextAssignmentsByUserAndTask = async (
    annotator_id: string,
    task_id: string
  ): Promise<Assignment> => {
    const { data, error } = await supabase
      .rpc("next_random_assignment", { a_id: annotator_id, t_id: task_id })
      .single();

    if (error)
      throw Error(
        `Error in findNextAssignmentsByUserAndTask: ${error.message}`
      );
    else return data as Assignment;
  };

  const countAssignmentsByUserAndTask = async (
    annotator_id: string,
    task_id: number
  ) => {
    const { data: next } = await supabase
      .from("assignments")
      .select("seq_pos")
      .eq("annotator_id", annotator_id)
      .eq("task_id", task_id)
      .eq("status", "pending")
      .order("seq_pos", { ascending: true })
      .limit(1)
      .single();
    const { data: total } = await supabase
      .from("assignments")
      .select("count")
      .eq("annotator_id", annotator_id)
      .eq("task_id", task_id)
      .single();

    return {
      next: next?.seq_pos ?? total?.count! + 1,
      total: total?.count ?? 0,
    };
  };

  // Update
  const updateAssignment = async (
    id: string,
    fields: Partial<Assignment>
  ): Promise<boolean> => {
    const { data, error } = await supabase
      .from("assignments")
      .update(fields)
      .eq("id", id);

    if (error) throw Error(`Error in updateAssignment: ${error.message}`);
    else return true;
  };

  // Delete
  const deleteAssignment = async (id: string) => {
    const { data, error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", id);

    if (error) throw Error(`Error in deleteAssignment: ${error.message}`);
    else return true;
  };

  const deleteAllAssignments = async (task_id: string) => {
    const { data, error } = await supabase
      .from("assignments")
      .delete()
      .eq("task_id", task_id);

    if (error) throw Error(`Error in deleteAllAssignment: ${error.message}`);
    else return true;
  };

  return {
    createAssignment,
    createAssignments,
    findAssignment,
    getCountByUser,
    findAssignmentsByTask,
    findAssignmentsByUser,
    updateAssignment,
    deleteAssignment,
    deleteAllAssignments,
    findNextAssignmentsByUserAndTask,
    countAssignmentsByUserAndTask,
    findAssignmentsByUserTaskSeq,
  };
};
