import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/supabase";
import type { H3Event } from "h3";

export type IaaAnnotation = {
  start: number;
  end: number;
  label: string;
  text: string;
};

export type IaaAssignment = {
  annotator: string;
  difficulty_rating: number;
  annotations: IaaAnnotation[];
};

export type IaaDocument = {
  name: string;
  full_text: string;
  assignments: IaaAssignment[];
};

export type IaaInputData = {
  labelset: { labels: { name: string }[] };
  documents: IaaDocument[];
  annotation_level?: "document";
};

export async function buildIaaInputData(
  event: H3Event,
  params: {
    task_id: number;
    labelset_id: number;
    annotation_level?: string | null;
    documentIds?: number[];
    annotatorEmails?: string[];
    labelNames?: string[];
  }
): Promise<IaaInputData> {
  const supabase = await serverSupabaseServiceRole<Database>(event);

  const { data: labelset, error: labelsetError } = await supabase
    .from("labelsets")
    .select("labels")
    .eq("id", params.labelset_id)
    .single();

  if (labelsetError)
    throw new Error(`Error fetching labelset for IAA input: ${labelsetError.message}`);

  const allLabelNames = (
    (labelset?.labels as { name: string; color: string }[] | null) ?? []
  ).map((l) => l.name);
  const labelNames = params.labelNames?.length ? params.labelNames : allLabelNames;
  const labelFilter = new Set(labelNames);

  let query = supabase
    .from("assignments")
    .select(
      "id, document_id, difficulty_rating, document:documents(id, name, full_text), annotator:users!inner(email), annotations(start_index, end_index, label, text)"
    )
    .eq("task_id", params.task_id)
    .order("document_id");

  if (params.documentIds?.length) query = query.in("document_id", params.documentIds);
  if (params.annotatorEmails?.length) query = query.in("users.email", params.annotatorEmails);

  const { data, error } = await query;
  if (error) throw new Error(`Error fetching assignments for IAA input: ${error.message}`);

  const documentsById = new Map<number, IaaDocument>();

  for (const row of data ?? []) {
    if (!row.document) continue;

    let doc = documentsById.get(row.document.id);
    if (!doc) {
      doc = {
        name: row.document.name ?? "",
        full_text: row.document.full_text ?? "",
        assignments: [],
      };
      documentsById.set(row.document.id, doc);
    }

    const annotations: IaaAnnotation[] = (row.annotations ?? [])
      .filter((a) => a.label != null && labelFilter.has(a.label))
      .map((a) => ({
        start: a.start_index ?? 0,
        end: a.end_index ?? 0,
        label: a.label!,
        text: a.text ?? "",
      }));

    doc.assignments.push({
      annotator: row.annotator!.email!,
      difficulty_rating: row.difficulty_rating ?? 0,
      annotations,
    });
  }

  return {
    labelset: { labels: labelNames.map((name) => ({ name })) },
    documents: Array.from(documentsById.values()),
    annotation_level: params.annotation_level === "document" ? "document" : undefined,
  };
}
