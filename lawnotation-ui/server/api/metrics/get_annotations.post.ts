import { serverSupabaseClient } from "#supabase/server";
import {
  sortByDocumentAndRange,
  setTextToHidden,
  separateIntoWords,
} from "~/utils/metrics";
import { RichAnnotation, Document } from "~/types";
import { Database } from "~/types/supabase";
import { H3Event } from "h3";

type DocDic = Record<number, {full_text: string, name: string}>

export default eventHandler(async (event) => {
  const data = await readBody(event);

  const documentsDataPromise = getDocuments(
    event,
    data.task_id,
    data.documents
  );

  const annotationsPromise: Promise<RichAnnotation[]> =
    findAnnotationsByTaskLabelDocumentsAnnotators(
      event,
      data.task_id,
      data.label,
      data.documents,
      data.annotators
    );

  const annotations = await annotationsPromise;
  const documentsData = await documentsDataPromise;

  let result = [];

  result = await getNonAnnotations(
    annotations,
    documentsData[0],
    documentsData[1]
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
  documentsData: DocDic,
  documentsOptions: number[]
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
      if (documentsData[current_ann.doc_id] && last_end < documentsData[previous_ann.doc_id].full_text.length) {
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
          doc_name: previous_ann.doc_name,
        });
      }
      last_end = 0;
    }

    // doc(s) without annotations
    let next_doc_id = documentsOptions[docs_index];
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
        doc_name: documentsData[next_doc_id].name,
      });
      next_doc_id = documentsOptions[++docs_index];
    }

    if (last_end < current_ann.start) {
      if (!documentsData[current_ann.doc_id])
        continue;
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
        doc_name: current_ann.doc_name,
      });
    }

    new_annotations.push(current_ann);
    last_end = Math.max(last_end, current_ann.end);
    previous_ann = current_ann;
  }

  if (documentsData[previous_ann.doc_id] && last_end < documentsData[previous_ann.doc_id].full_text.length) {
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
      doc_name: previous_ann.doc_name,
    });
  }
  return new_annotations;
}

// DB
async function findAnnotationsByTaskLabelDocumentsAnnotators(
  event: any,
  task_id: string,
  label: string,
  documents: string[] | undefined,
  annotators: string[] | undefined
): Promise<RichAnnotation[]> {
  const supabase = serverSupabaseClient<Database>(event);
  let query = supabase
    .from("annotations")
    .select(
      "id, start_index, end_index, label, text, assignment:assignments!inner(task_id, document_id, document:documents(id, name), annotator:users!inner(email))"
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
        text: ann.text!.replaceAll("\\n", ""),
        label: ann.label,
        annotator: ann.assignment!.annotator!.email,
        hidden: false,
        ann_id: ann.id,
        doc_id: ann.assignment!.document_id,
        doc_name: ann.assignment!.document!.name,
      } as RichAnnotation;
    });
  }
}

async function getDocuments(event: H3Event, task_id: number, documents: number[]) {
  const supabase = serverSupabaseClient<Database>(event);
  let list: number[] = [];
  let dic: DocDic = {};
  let query = supabase.rpc("get_all_shared_docs_from_task", {
    t_id: task_id,
  });

  if (documents && documents.length) query = query.in("id", [documents]);

  const { data, error } = await query.order("id");

  if (error) {
    throw new Error(error.message);
  } else {
    (data).map((d) => {
      list.push(d.id);
      if (!(d.id in dic)) {
        dic[d.id] = { full_text: d.full_text ?? '', name: d.name ?? '' };
      }
    });
  }

  return [dic, list] as [DocDic, number[]];
}

// Bottom function is not used:
/*
const findAnnotationsByTask = async (
  event: any,
  task_id: string
): Promise<any> => {
  const supabase = serverSupabaseClient<Database>(event);
  let query = supabase
    .from("annotations")
    .select(
      "id, start_index, end_index, label, text, assignment:assignments!inner(task_id, document_id, document:documents(id, name), annotator:users!inner(email))"
    )
    .eq("assignments.task_id", task_id);

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
        text: ann.text,
        label: ann.label,
        annotator: ann.assignment.annotator.email,
        hidden: false,
        ann_id: ann.id,
        doc_id: ann.assignment.document_id,
        doc_name: ann.assignment.document.name,
      } as RichAnnotation;
    });
  }
};
*/