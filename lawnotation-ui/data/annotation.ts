export type Annotation = {
    id: number,
    assignment_id: number,
    start_index: number,
    end_index: number,
    text: string,
    origin: string,
    ls_id: string,
    label: string[]
  }
  
  export const useAnnotationApi = () => {
    const supabase = useSupabaseClient();

    const convert_ls2db = (anns: any[], assignment_id: number): Annotation[] => {
        return anns.map(a => {
            return {
                ls_id: a.id,
                origin: a.origin,
                start_index: a.value.start,
                end_index: a.value.end,
                text: a.value.text,
                label: a.value.labels[0],
                assignment_id: assignment_id
            };
        })
    }

    const convert_db2ls = (anns: Annotation[], assignment_id: number): any => {
        const arr = anns.map(a => {
            return {
                id: a.ls_id,
                origin: a.origin,
                from_name: "label",
                to_name: "text",
                type: "labels",
                value: {
                    start: a.start_index,
                    end: a.end_index,
                    text: a.text,
                    labels: [a.label]
                }
            };
        })

        return [{ id: assignment_id, result: arr }]
    }
    
    // Create
    const createAnnotation = async (fields: Omit<Annotation, 'id'>): Promise<Annotation> => {
      const { data, error } = await supabase.from("annotations").insert(fields).select().single();
      if (error)
        throw Error(`Error in createAnnotation: ${error.message}`)
      else
        return data as Annotation;
    };
  
    // Read
    const findAnnotation = async (id: string): Promise<Annotation>   => {
      const { data, error } = await supabase.from("annotations").select().eq("id", id).single();
  
      if (error)
        throw Error(`Error in findAnnotation: ${error.message}`)
      else
        return data as Annotation
    };
  
    // Read all
    const findAnnotations = async (assignment_id: string): Promise<Annotation[]> => {
      const { data, error } = await supabase.from("annotations").select().eq("assignment_id", assignment_id);
      
      if (error)
        throw Error(`Error in findAnnotation: ${error.message}`)
      else
        return data as Annotation[]
    };
  
    // Update
    const updateAnnotation = async (id: string, fields: Partial<Annotation>): Promise<boolean> => {
      const { data, error } = await supabase.from("annotations").update(fields).eq("id", id);
      
      if (error)
        throw Error(`Error in updateAnnotation: ${error.message}`)
      else
        return true;
    };
  
    // Update
    const deleteAnnotation = async (id: string) => {
      const { data, error } = await supabase.from("annotations").delete().eq("id", id);
  
      if (error)
        throw Error(`Error in deleteAnnotation: ${error.message}`)
      else
        return true;
    };
  
    return {createAnnotation, findAnnotation, findAnnotations, updateAnnotation, deleteAnnotation, convert_ls2db, convert_db2ls}
  }