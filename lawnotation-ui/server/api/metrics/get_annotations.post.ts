import { serverSupabaseServiceRole } from "#supabase/server";
import { sortByDocumentAndRange } from "~/utils/metrics";
import { type RichAnnotation } from "~/utils/metrics";
import type { Database } from "~/types/supabase";

export default eventHandler(async (event) => {
  const data = await readBody(event);

  const annotations = await findAnnotationsByTaskLabelDocumentsAnnotators(
    event,
    data.task_id,
    data.labels,
    data.documents,
    data.annotators,
    data.intra
  );

  sortByDocumentAndRange(annotations);

  return annotations;
});

// DB
async function findAnnotationsByTaskLabelDocumentsAnnotators(
  event: any,
  task_id: string,
  labels: string[] | undefined,
  documents: string[] | undefined,
  annotators: string[] | undefined,
  intra: boolean
): Promise<RichAnnotation[]> {
  const supabase = await serverSupabaseServiceRole<Database>(event);
  let query = supabase
    .from("annotations")
    .select(
      "id, start_index, end_index, label, text, confidence_rating, metadata, assignment:assignments!inner(task_id, document_id, original_task_id, document:documents(id, name), annotator:users!inner(email))"
    )
    .eq("assignments.task_id", task_id);

  if (labels && labels.length > 0) query = query.in("label", labels);

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
        text: ann.text,
        label: ann.label,
        annotator: intra
          ? `${ann.assignment!.original_task_id}-${
              ann.assignment!.annotator!.email
            }`
          : ann.assignment!.annotator!.email,
        hidden: false,
        ann_id: ann.id,
        doc_id: ann.assignment!.document_id,
        doc_name: ann.assignment!.document!.name,
        confidence: ann.confidence_rating,
        original_task_id: ann.assignment!.original_task_id,
        metadata: ann.metadata
      } as RichAnnotation;
    });
  }
}
