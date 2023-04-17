
export type Label = {
    id: number,
    name: string,
    desc: string,
    data: []
  }
  
  export const useLabelApi = () => {
    const supabase = useSupabaseClient();
    
    // Create
    const createLabel = async (fields: Omit<Label, 'id'>): Promise<Label> => {
      const { data, error } = await supabase.from("labels").insert(fields).select().single();
      if (error)
        throw Error(`Error in createLabel: ${error.message}`)
      else
        return data as Label;
    };
  
    // Read
    const findLabel = async (id: string): Promise<Label>   => {
      const { data, error } = await supabase.from("labels").select().eq("id", id).single();
  
      if (error)
        throw Error(`Error in findLabel: ${error.message}`)
      else
        return data as Label
    };
  
    // Update
    const updateLabel = async (id: string, fields: Partial<Label>): Promise<boolean> => {
      const { data, error } = await supabase.from("labels").update(fields).eq("id", id);
      
      if (error)
        throw Error(`Error in updateLabel: ${error.message}`)
      else
        return true;
    };
  
    // Update
    const deleteLabel = async (id: string) => {
      const { data, error } = await supabase.from("labels").delete().eq("id", id);
  
      if (error)
        throw Error(`Error in deleteLabel: ${error.message}`)
      else
        return true;
    };
  
    return {createLabel, findLabel, updateLabel, deleteLabel}
  }