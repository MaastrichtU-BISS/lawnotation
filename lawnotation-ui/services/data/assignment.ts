import { Assignment } from "@/types/assignment"
import createSupabaseClient from "./common/client.supabase";
import crud_data from "./common/crud.supabase";
import { H3Event } from 'h3';

export const assignmentDataService = (event: H3Event) => {
  const client = createSupabaseClient(event);

  return {
    ...crud_data(client, 'assignments'),

    findAssignmentsByTaskId: async (task_id: string): Promise<Assignment[]> => {
      const { data, error } = await client.from("assignments").select().eq("task_id", task_id);
      
      if (error)
        throw Error(`Error in findAssignment: ${error.message}`)
      else
        return data as Assignment[]
    },

    findAssignmentsByUserTaskSeq: async (annotator_id: string, task_id: string, seq_pos: number): Promise<Assignment> => {
      const { data, error } = await client.from("assignments")
        .select()
        .eq("task_id", task_id)
        .eq("annotator_id", annotator_id)
        .eq("seq_pos", seq_pos)
        .single();
      
      if (error)
        throw Error(`Error in findAssignmentsByUserTaskSeq: ${error.message}`)
      else
        return data as Assignment
    },

    findAssignmentsByUser: async (annotator_id: string): Promise<Assignment[]> => {
      const { data, error } = await client.from("assignments").select().eq("annotator_id", annotator_id);
      
      if (error)
        throw Error(`Error in findAssignment: ${error.message}`)
      else
        return data as Assignment[]
    },

    findNextAssignmentsByUserAndTask: async (annotator_id: string, task_id: string): Promise<Assignment> => {
      const { data, error } = await client.rpc("next_random_assignment", { a_id: annotator_id, t_id: task_id }).single()

      if (error)
        throw Error(`Error in findNextAssignmentsByUserAndTask: ${error.message}`)
      else
        return data as Assignment
    },

    countAssignmentsByUserAndTask: async (annotator_id: string, task_id: number) => {
      const { data: next } = await client.from("assignments").select("seq_pos").eq("annotator_id", annotator_id).eq("task_id", task_id).eq("status", "pending").order('seq_pos', {ascending: true}).limit(1).single();
      const { count: total } = await client.from("assignments").select("*", { count: 'exact', head: true }).eq("annotator_id", annotator_id).eq("task_id", task_id);

      return {
        next: next?.seq_pos ?? 0,
        total: total ?? 0
      }
    }
  }
}

export default assignmentDataService;