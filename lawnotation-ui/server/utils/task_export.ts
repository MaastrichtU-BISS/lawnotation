import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/supabase";
import type { Label } from "~/types";
import type { ExportTaskOptions } from "~/utils/io";

export type RichAnnotation = {
  id: number;
  start: number;
  end: number;
  label: string;
  text: string;
  ls_id: string | null;
  confidence_rating: number;
  html_metadata: unknown;
  relations: { to: number; direction: string; labels: string[] }[];
};

export type RichAssignment = {
  id: number;
  annotator_id: string;
  annotator_email: string;
  order: number;
  status: string;
  difficulty_rating: number;
  annotations: RichAnnotation[];
};

export type RichDocument = {
  id: number;
  name: string;
  full_text: string;
  assignments: RichAssignment[];
};

// Superset of everything either the task-export download or the IAA metrics
// service could need, fetched once so both can be derived from it without
// re-querying Supabase.
export type TaskExportData = {
  task: {
    name: string;
    desc: string;
    ann_guidelines: string;
    annotation_level: string | null;
  };
  labelset: { name: string; desc: string; labels: Label[] };
  documents: RichDocument[];
};

export async function buildTaskExportData(
  supabase: SupabaseClient<Database>,
  task_id: number
): Promise<TaskExportData> {
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("name, desc, ann_guidelines, annotation_level, labelset_id")
    .eq("id", task_id)
    .single();

  if (taskError || !task)
    throw new Error(`Error fetching task for export: ${taskError?.message}`);

  const [labelsetRes, documentsRes, assignmentsRes, annotationsRes, relationsRes] =
    await Promise.all([
      supabase
        .from("labelsets")
        .select("name, desc, labels")
        .eq("id", task.labelset_id!)
        .single(),
      supabase.rpc("get_all_docs_from_task", { t_id: task_id }),
      supabase
        .from("assignments")
        .select(
          "id, document_id, annotator_id, seq_pos, status, difficulty_rating, annotator:users!inner(email)"
        )
        .eq("task_id", task_id)
        .order("id", { ascending: true }),
      supabase
        .from("annotations")
        .select(
          "id, assignment_id, start_index, end_index, label, text, ls_id, confidence_rating, html_metadata, assignment:assignments!inner(task_id)"
        )
        .eq("assignment.task_id", task_id)
        .order("id"),
      supabase
        .from("annotation_relations")
        .select(
          "from_id, to_id, direction, labels, annotation:from_id!inner(id, assignment:assignments!inner(id, task_id, document_id))"
        )
        .eq("from_id.assignments.task_id", task_id),
    ]);

  if (labelsetRes.error)
    throw new Error(`Error fetching labelset for export: ${labelsetRes.error.message}`);
  if (documentsRes.error)
    throw new Error(`Error fetching documents for export: ${documentsRes.error.message}`);
  if (assignmentsRes.error)
    throw new Error(`Error fetching assignments for export: ${assignmentsRes.error.message}`);
  if (annotationsRes.error)
    throw new Error(`Error fetching annotations for export: ${annotationsRes.error.message}`);
  if (relationsRes.error)
    throw new Error(`Error fetching relations for export: ${relationsRes.error.message}`);

  const documentsById = new Map<number, RichDocument>();
  for (const doc of documentsRes.data ?? []) {
    documentsById.set(doc.id, {
      id: doc.id,
      name: doc.name ?? "",
      full_text: doc.full_text ?? "",
      assignments: [],
    });
  }

  const assignmentsById = new Map<number, RichAssignment>();
  for (const ass of assignmentsRes.data ?? []) {
    const doc = documentsById.get(ass.document_id!);
    if (!doc) continue;

    const richAssignment: RichAssignment = {
      id: ass.id,
      annotator_id: ass.annotator_id!,
      annotator_email: ass.annotator!.email!,
      order: ass.seq_pos ?? 0,
      status: ass.status ?? "",
      difficulty_rating: ass.difficulty_rating ?? 0,
      annotations: [],
    };
    assignmentsById.set(ass.id, richAssignment);
    doc.assignments.push(richAssignment);
  }

  const annotationsById = new Map<number, RichAnnotation>();
  for (const ann of annotationsRes.data ?? []) {
    const assignment = assignmentsById.get(ann.assignment_id!);
    if (!assignment) continue;

    const richAnnotation: RichAnnotation = {
      id: ann.id,
      start: ann.start_index ?? 0,
      end: ann.end_index ?? 0,
      label: ann.label ?? "",
      text: ann.text ?? "",
      ls_id: ann.ls_id,
      confidence_rating: ann.confidence_rating,
      html_metadata: ann.html_metadata,
      relations: [],
    };
    annotationsById.set(ann.id, richAnnotation);
    assignment.annotations.push(richAnnotation);
  }

  for (const rel of relationsRes.data ?? []) {
    const fromAnnotation = annotationsById.get(rel.from_id!);
    if (!fromAnnotation) continue;

    fromAnnotation.relations.push({
      to: rel.to_id!,
      direction: rel.direction ?? "",
      labels: rel.labels ?? [],
    });
  }

  return {
    task: {
      name: task.name ?? "",
      desc: task.desc ?? "",
      ann_guidelines: task.ann_guidelines ?? "",
      annotation_level: task.annotation_level,
    },
    labelset: {
      name: labelsetRes.data!.name ?? "",
      desc: labelsetRes.data!.desc ?? "",
      labels: (labelsetRes.data!.labels as Label[] | null) ?? [],
    },
    documents: Array.from(documentsById.values()),
  };
}

// Shape used by the task-export download button. Annotators are anonymized
// to sequential integers (in first-seen order) so emails never leave the
// server in the exported file.
export function toExportJson(data: TaskExportData, options: ExportTaskOptions) {
  const json: any = {};

  if (options.name) json.name = data.task.name;
  if (options.desc) json.desc = data.task.desc;

  if (options.labelset) {
    json.labelset = {
      name: data.labelset.name,
      desc: data.labelset.desc,
      labels: data.labelset.labels,
    };
    if (options.ann_guidelines) json.ann_guidelines = data.task.ann_guidelines;
  }

  if (options.documents) {
    const includeAnnotations = options.annotations && options.labelset;
    const annotatorIndices = new Map<string, number>();

    json.documents = data.documents.map((doc) => ({
      name: doc.name,
      full_text: doc.full_text,
      assignments: doc.assignments.map((ass) => {
        if (!annotatorIndices.has(ass.annotator_id))
          annotatorIndices.set(ass.annotator_id, annotatorIndices.size + 1);

        const annPositions = new Map<number, number>();
        ass.annotations.forEach((ann, index) => annPositions.set(ann.id, index));

        const annotations = includeAnnotations
          ? ass.annotations.map((ann) => ({
              start: ann.start,
              end: ann.end,
              label: ann.label,
              text: ann.text,
              relations: ann.relations
                .filter((rel) => annPositions.has(rel.to))
                .map((rel) => ({
                  to: annPositions.get(rel.to)!,
                  direction: rel.direction,
                  labels: rel.labels,
                })),
              ls_id: ann.ls_id,
              confidence_rating: ann.confidence_rating,
              html_metadata: ann.html_metadata,
            }))
          : [];

        return {
          annotator: annotatorIndices.get(ass.annotator_id),
          order: ass.order,
          status: ass.status,
          difficulty_rating: ass.difficulty_rating,
          annotations,
        };
      }),
    }));

    json.counts = {
      documents: data.documents.length,
      assignments: data.documents.reduce((sum, d) => sum + d.assignments.length, 0),
      annotators: annotatorIndices.size,
    };

    if (includeAnnotations) {
      json.annotation_level = data.task.annotation_level;
      json.counts.annotations = data.documents.reduce(
        (sum, d) => sum + d.assignments.reduce((s, a) => s + a.annotations.length, 0),
        0
      );
      json.counts.relations = data.documents.reduce(
        (sum, d) =>
          sum +
          d.assignments.reduce(
            (s, a) => s + a.annotations.reduce((r, ann) => r + ann.relations.length, 0),
            0
          ),
        0
      );
    }
  }

  return json;
}
