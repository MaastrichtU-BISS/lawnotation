import { Document } from "@/types/document"
import createSupabaseClient from "./common/client.supabase";
import crud_data from "./common/crud.supabase";
import { H3Event } from 'h3';

export const documentDataService = (event: H3Event) => {
  const client = createSupabaseClient(event);

  return {
    ...crud_data(client, 'documents'),

    findDocumentsByProjectId: async (project_id: number) => {
      const { data, error } = await client.from("documents").select().eq("project_id", project_id);
      
      if (error)
        throw Error(`Error in ${getFunctionCaller()}: ${error.message}`)
      else
        return data;
    },
    
    findSharedDocumentsByTaskId: async (task_id: number) => {
      const { data, error } = await client.rpc("get_all_shared_docs_from_task", {t_id: task_id});
      
      if (error)
        throw Error(`Error in ${getFunctionCaller()}: ${error.message}`)
      else
        return data
    },

    tableDocuments: async (project_id: number, offset: number, limit: number) => {
      const { data, error, count } = await client
        .from("documents")
        .select('*', { count: 'exact' })
        .eq("project_id", project_id)
        .range(offset, offset + limit - 1);
      
      if (error)
        throw Error(`Error in tableDocuments: ${error.message}`)
      else
        return {rows: data, count};
    },

    takeUpToNRandomDocuments: async (project_id: string  | undefined, N: number): Promise<number[]> => {
      const { data, error } = await client.rpc("random_sample", {n: N, pid: project_id});
      
      if (error)
        throw Error(`Error in findDocument: ${error.message}`)
      else
        return data as number[]
    },

    totalAmountOfDocs: async (project_id: string) => {
      const { data, error, count } = await client.from("documents").select("*", { count: "exact", head: true }).eq("project_id", project_id);

      if (error)
        throw Error(`Error in totalAmountOfDocs: ${error.message}`)
      else
        return count;
    },

    getName: async (id: string) => {
      const { data, error } = await client.from("documents").select("name").eq("id", id).single();

      if (error)
        throw Error(`Error in getName: ${error.message}`)
      else
        return data.name;
    }
  }
}

export default documentDataService;