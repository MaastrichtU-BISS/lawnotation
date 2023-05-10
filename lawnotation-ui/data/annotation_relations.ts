import { Annotation } from './annotation';

export type AnnotationRelation = {
    id: number,
    from_id: number,
    to_id: number,
    ls_to: string,
    ls_from: string,
    direction: string,
    labels: string[]
  }

export type LSSerializedRelation = {
    from_id: string,
    to_id: string,
    direction: string,
    labels: string[],
    type: string
};
  
    
  export const useAnnotationRelationApi = () => {
    const supabase = useSupabaseClient();
  
    const convert_ls2db = (rel: LSSerializedRelation, from_id: number, to_id: number): Omit<AnnotationRelation, "id"> => {
        return {
          ls_from: rel.from_id,
          ls_to: rel.to_id,
          direction: rel.direction,
          labels: rel.labels,
          from_id: from_id,
          to_id: to_id,
        };
    }
  
    const convert_db2ls = (rel: AnnotationRelation): LSSerializedRelation => {
        return {
            from_id: rel.ls_from,
            to_id: rel.ls_to,
            labels: rel.labels,
            direction: rel.direction,
            type: 'relation'
          };
    }
    
    // Create
    const createRelation = async (fields: LSSerializedRelation, from_id: number, to_id: number): Promise<AnnotationRelation> => {
      const { data, error } = await supabase.from("annotation_relations").insert(convert_ls2db(fields, from_id, to_id) as never).select().single();

      if (error)
        throw Error(`Error in createRelation: ${error.message}`)
      else
        return data as AnnotationRelation;
    };
    
    // Read
    const findRelation = async (id: string): Promise<AnnotationRelation>   => {
      const { data, error } = await supabase.from("annotation_relations").select().eq("id", id).single();
    
      if (error)
        throw Error(`Error in findRelation: ${error.message}`)
      else
        return data as AnnotationRelation
    };
    
    // Read all
    const findRelations = async (anns :Annotation[]): Promise<AnnotationRelation[]> => {
        var relations: AnnotationRelation[] = [];
        for (let i = 0; i < anns.length; ++i) {
            const { data, error } = await supabase.from("annotation_relations").select().eq("from_id", anns[i].id);
            relations.push(... data as AnnotationRelation[]);
        }
        return relations;
    };
    
//     // Update
//     const updateAnnotation = async (id: string, fields: Partial<Annotation>): Promise<boolean> => {
//       const { data, error } = await supabase.from("annotations").update(fields).eq("id", id);
      
//       if (error)
//         throw Error(`Error in updateAnnotation: ${error.message}`)
//       else
//         return true;
//     };
    
    // Update
    // const updateRelations = async (relations: LSSerializedRelations[]): Promise<AnnotationRelation[] | null> => {
    //   const query_delete = await supabase.from("annotations").delete().eq("assignment_id", assignment_id);
  
    //   if (query_delete.error)
    //     throw Error(`Unable to delete annotations on update: ${query_delete.error.message}`)
    //   const query_insert = await supabase.from("annotations").insert(annotations).select();
    //   if (query_insert.error)
    //     throw Error(`Unable to insert annotations on update: ${query_insert.error.message}`)
  
    //   annotations.push(...query_insert.data);
    //   console.log("updated annotations: ", query_insert.data);
  
    //   return query_insert.data;
      
    // };
    
//     // Delete
//     const deleteAnnotation = async (id: string) => {
//       const { data, error } = await supabase.from("annotations").delete().eq("id", id);
    
//       if (error)
//         throw Error(`Error in deleteAnnotation: ${error.message}`)
//       else
//         return true;
//     };
    
    return {createRelation, findRelation, findRelations, convert_ls2db, convert_db2ls}
  }