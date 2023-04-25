export type Labelset = {
  id: string,
  name: string,
  desc: string,
  labels: {name: string, color: string}[]
}

export type LsLabels = Labelset['labels']

export const useLabelsetApi = () => {
  const supabase = useSupabaseClient();
  
  // Create
  const createLabelset = async (fields: Omit<Labelset, 'id'>): Promise<Labelset> => {
    const { data, error } = await supabase.from("labelsets").insert(fields).select().single();
    if (error)
      throw Error(`Error in createLabelset: ${error.message}`)
    else
      return data as Labelset;
  };

  // Read
  const findLabelset = async (id: Labelset['id']): Promise<Labelset>   => {
    const { data, error } = await supabase.from("labelsets").select().eq("id", id).single();

    if (error)
      throw Error(`Error in findLabelset: ${error.message}`)
    else
      return data as Labelset
  };

  // Read
  const findLabelsets = async (): Promise<Labelset[]>   => {
    const { data, error } = await supabase.from("labelsets").select();

    if (error)
      throw Error(`Error in findLabelset: ${error.message}`)
    else
      return data
  };

  // Update
  const updateLabelset = async (id: string, fields: Partial<Labelset>): Promise<boolean> => {
    const { data, error } = await supabase.from("labelsets").update(fields).eq("id", id);
    
    if (error)
      throw Error(`Error in updateLabelset: ${error.message}`)
    else
      return true;
  };

  // Update
  const deleteLabelset = async (id: Labelset['id']) => {
    const { data, error } = await supabase.from("labelsets").delete().eq("id", id);

    if (error)
      throw Error(`Error in deleteLabelset: ${error.message}`)
    else
      return true;
  };

  return { createLabelset, findLabelset, updateLabelset, deleteLabelset }
}