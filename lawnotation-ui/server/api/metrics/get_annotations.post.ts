import { serverSupabaseClient } from "#supabase/server";
import {
  sortByDocumentAndRange,
  setTextToHidden,
  separateIntoWords,
} from "~/utils/metrics";
import { RichAnnotation } from "~/types";

export default eventHandler(async (event) => {
  const data = await readBody(event);
  //   const documentsData = await findSharedDocumentsByTask(event, data.task_id);
  const annotations = await findAnnotationsByTaskLabelDocumentsAnnotators(
    event,
    data.task_id,
    data.label,
    data.documents,
    data.annotators
  );

  let result = [];

  result = await getNonAnnotations(
    annotations,
    data.documentsData,
    data.documentsOptions
  );

  if (data.byWords) {
    result = separateIntoWords(result);
  }

  if (data.hideNonText) {
    result = setTextToHidden(result, data.hideNonText);
  }

  return result;
});

async function getNonAnnotations(
  annotations: RichAnnotation[],
  documentsData: any,
  documentsOptions: string[]
) {
  if (!annotations || !annotations.length) return [];
  sortByDocumentAndRange(annotations);
  var new_annotations: RichAnnotation[] = [];
  var last_end: number = 0;
  var docs_index: number = 0;
  var previous_ann = annotations[0];
  for (let i = 0; i < annotations.length; ++i) {
    var current_ann = annotations[i];
    // new document
    if (previous_ann.doc_id != current_ann.doc_id) {
      docs_index++;
      if (last_end < documentsData[previous_ann.doc_id].full_text.length) {
        new_annotations.push({
          start: last_end,
          end: documentsData[previous_ann.doc_id].full_text.length,
          label: "NOT ANNOTATED",
          text: documentsData[previous_ann.doc_id].full_text.substring(
            last_end,
            documentsData[previous_ann.doc_id].full_text.length
          ),
          annotator: "",
          hidden: false,
          ann_id: -1,
          doc_id: previous_ann.doc_id,
        });
      }
      last_end = 0;
    }

    // doc(s) without annotations
    var next_doc_id = documentsOptions[docs_index];
    while (next_doc_id < current_ann.doc_id) {
      new_annotations.push({
        start: 0,
        end: documentsData[next_doc_id].full_text.length - 1,
        label: "NOT ANNOTATED",
        text: documentsData[next_doc_id].full_text,
        annotator: "",
        hidden: false,
        ann_id: -1,
        doc_id: next_doc_id,
      });
      next_doc_id = documentsOptions[++docs_index];
    }

    if (last_end < current_ann.start) {
      new_annotations.push({
        start: last_end,
        end: current_ann.start,
        label: "NOT ANNOTATED",
        text: documentsData[current_ann.doc_id].full_text.substring(
          last_end,
          current_ann.start
        ),
        annotator: "",
        hidden: false,
        ann_id: -1,
        doc_id: current_ann.doc_id,
      });
    }

    new_annotations.push(current_ann);
    last_end = Math.max(last_end, current_ann.end);
    previous_ann = current_ann;
  }

  new_annotations.push({
    start: last_end,
    end: documentsData[previous_ann.doc_id].full_text.length,
    label: "NOT ANNOTATED",
    text: documentsData[previous_ann.doc_id].full_text.substring(
      last_end,
      documentsData[previous_ann.doc_id].full_text.length
    ),
    annotator: "",
    hidden: false,
    ann_id: -1,
    doc_id: previous_ann.doc_id,
  });
  return new_annotations;
}

// DB
async function findAnnotationsByTaskLabelDocumentsAnnotators(
  event: any,
  task_id: string,
  label: string,
  documents: string[] | undefined,
  annotators: string[] | undefined
): Promise<any> {
  const supabase = serverSupabaseClient(event);
  let query = supabase
    .from("annotations")
    .select(
      "id, start_index, end_index, label, text, assignment:assignments!inner(task_id, document_id, document:documents(id, full_text, name), annotator:users!inner(email))"
    )
    .eq("assignments.task_id", task_id)
    .eq("label", label);

  if (documents && documents.length > 0)
    query = query.in("assignments.document_id", documents);

  if (annotators && annotators.length > 0)
    query = query.in("assignments.users.email", annotators);

  const { data, error } = await query;
  if (error)
    throw Error(
      `Error in findAnnotationsByTaskAndDocumentAndLabel: ${error.message}`
    );
  else {
    return data.map((ann) => {
      return {
        start: ann.start_index,
        end: ann.end_index,
        text: ann.text.replaceAll("\\n", ""),
        label: ann.label,
        annotator: ann.assignment.annotator.email,
        hidden: false,
        ann_id: ann.id,
        doc_id: ann.assignment.document_id,
      };
    });
  }
}

// async function findSharedDocumentsByTask(event: any, task_id: string) {
//   const supabase = serverSupabaseClient(event);
//   let res: any = {};
//   const { data, error } = await supabase.rpc("get_all_shared_docs_from_task", {
//     t_id: task_id,
//   });
//   if (error)
//     throw new Error(`ERROR in findSharedDocumentsByTask: ${error.message}`);
//   else {
//     (data as Document[]).map((d: Document) => {
//       if (!(d.id in res)) {
//         res[d.id] = { full_text: d.full_text, name: d.name };
//       }
//     });
//   }
//   return res;
// }
