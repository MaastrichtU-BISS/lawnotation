export type Document = {
  id: number,
  name: string,
  project_id: string,
  source: string,
  full_text: string | undefined,
}

export const useDocumentApi = () => {
  const supabase = useSupabaseClient();
  
  // Create
  const createDocument = async (fields: Omit<Document, 'id'>): Promise<Document> => {
    const { data, error } = await supabase.from("documents").insert(fields).select().single();
    if (error)
      throw Error(`Error in createDocument: ${error.message}`)
    else
      return data as Document;
  };

  const createDocuments = async (fields: Omit<Document, 'id'>[]): Promise<Document[]> => {
    const { data, error } = await supabase.from("documents").insert(fields).select();
    if (error)
      throw Error(`Error in createDocument: ${error.message}`)
    else
      return data as Document[];
  };

  // Read
  const findDocument = async (id: string): Promise<Document>   => {
    const { data, error } = await supabase.from("documents").select().eq("id", id).single();

    if (error)
      throw Error(`Error in findDocument: ${error.message}`)
    else
      return data as Document
  };

  // Read all
  const findDocuments = async (project_id: string): Promise<Document[]> => {
    const { data, error } = await supabase.from("documents").select().eq("project_id", project_id);
    
    if (error)
      throw Error(`Error in findDocument: ${error.message}`)
    else
      return data as Document[]
  };

  const tableDocuments = async (project_id: number, offset: number, limit: number) => {
    const { data, error, count } = await supabase
      .from("documents")
      .select('*', { count: 'exact' })
      .eq("project_id", project_id)
      .range(offset, offset + limit - 1);
    
    if (error)
      throw Error(`Error in tableDocuments: ${error.message}`)
    else
      return {rows: data as Document[], count};
  }

  const takeUpToNRandomDocuments = async (project_id: string  | undefined, N: number): Promise<number[]> => {
    const { data, error } = await supabase.rpc("random_sample", {n: N, pid: project_id});
    
    if (error)
      throw Error(`Error in findDocument: ${error.message}`)
    else
      return data as number[]
  };

  const totalAmountOfDocs = async (project_id: string): Promise<number | null> => {
    const { data, error } = await supabase.from("documents").select("count").eq("project_id", project_id).single();
    if (error)
      throw Error(`Error in totalAmountOfDocs: ${error.message}`)
    else
      return data.count as number;
  };

  const getName = async (id: string): Promise<any> => {

    const { data, error } = await supabase.from("documents").select("name").eq("id", id).single();

    if (error)
        throw Error(`Error in inviteUser: ${error.message}`)
      else
        return data.name;
  }
   

  // Update
  const updateDocument = async (id: string, fields: Partial<Document>): Promise<boolean> => {
    const { data, error } = await supabase.from("documents").update(fields).eq("id", id);
    
    if (error)
      throw Error(`Error in updateDocument: ${error.message}`)
    else
      return true;
  };

  // Update
  const deleteDocument = async (id: string) => {
    const { data, error } = await supabase.from("documents").delete().eq("id", id);

    if (error)
      throw Error(`Error in deleteDocument: ${error.message}`)
    else
      return true;
  };

  return {
    createDocument,
    createDocuments,
    findDocument,
    findDocuments,
    tableDocuments,
    takeUpToNRandomDocuments,
    totalAmountOfDocs,
    updateDocument,
    deleteDocument,
    getName
  }
}