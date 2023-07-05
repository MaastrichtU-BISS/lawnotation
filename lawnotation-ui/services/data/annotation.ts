import { Annotation, LSSerializedAnnotations } from "@/types/annotation"
import createSupabaseClient from "./common/client.supabase";
import crud_data from "./common/crud.supabase";

export const convert_ls2db = (anns: LSSerializedAnnotations, assignment_id: number): Omit<Annotation, "id">[] => {
  return anns.map((ann) => {
    return {
      ls_id: ann.id,
      origin: ann.origin,
      start_index: ann.value.start,
      end_index: ann.value.end,
      text: ann.value.text,
      label: ann.value.labels[0],
      assignment_id: assignment_id,
    };
  });
};

export const convert_db2ls = (anns: Annotation[], assignment_id: number): LSSerializedAnnotations => {
  const arr = anns.map((a) => {
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
        labels: [a.label],
      },
    };
  });

  return arr;
};

const client = createSupabaseClient();

export const annotationDataService = {
  ...crud_data("annotations"),

  findAnnotationsByTaskAndDocumentAndLabelsAndAnnotators: async (
    task_id: string,
    document_id: string,
    label: string,
    annotators: string[]
  ) => {
    const { data, error } = await client
      .from("annotations")
      .select(
        "start_index, end_index, label, text, assignment:assignments!inner(task_id, document_id, annotator:users!inner(email))"
      )
      .eq("assignments.task_id", task_id)
      .eq("assignments.document_id", document_id)
      .eq("label", label)
      .in("assignments.users.email", annotators);

    if (error)
      throw Error(`Error in findAnnotationsByTaskAndDocumentAndLabel: ${error.message}`);
    else
      return data;
  },

  // Update
  updateAssignmentAnnotations: async (
    assignment_id: number,
    annotations: Omit<Annotation, "id">[]
  ): Promise<Annotation[] | null> => {
    const query_delete = await client
      .from("annotations")
      .delete()
      .eq("assignment_id", assignment_id);

    if (query_delete.error)
      throw Error(`Unable to delete old annotations on update: ${query_delete.error.message}`);
    
    const query_insert = await client
      .from("annotations")
      .insert(annotations)
      .select();
    
    if (query_insert.error)
      throw Error(`Unable to insert annotations on update: ${query_insert.error.message}`);

    annotations.push(...query_insert.data as Annotation[]);
    // console.log("updated annotations: ", query_insert.data);

    return query_insert.data as Annotation[];
  }

};

export default annotationDataService;