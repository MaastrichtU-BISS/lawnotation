import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router } from '~/server/trpc'
import type { RichAnnotation } from '~/utils/metrics';
import type { Context } from '../context';
import { appRouter } from '.';

// NOTE: this specific router serves as a boilerplate/starting point for a migration
// and is not used yet. To enable, uncomment in ./index.ts 

export type RangeLabel = {
  start: number;
  end: number;
  label: string;
  text: string;
  annotators: string[];
  doc_id: number;
  doc_name: string;
  zeros: number;
  ones: number;
  confidence: number;
};
export type MetricResult = {
  name: string;
  po: number | null;
  pe: number | null;
  result: number | null;
  table: RangeLabel[] | null;
};

const ZDocumentData = z.record(
  z.object({
    full_text: z.string(),
    name: z.string()
  })
);
const ZRichAnnotations = z.array(
  // RichAnnotation
  z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
    label: z.string(),
    annotator: z.string(),
    hidden: z.boolean(),
    ann_id: z.number(),
    doc_id: z.number(),
  })
);

const ZRangeLabel = z.object({
  start: z.number(),
  end: z.number(),
  label: z.string(),
  text: z.string(),
  annotators: z.array(z.string()),
  doc_id: z.number(),
  doc_name: z.string(),
  zeros: z.number(),
  ones: z.number(),
  confidence: z.number()
});
const ZMetricResult = z.object({
  name: z.string(),
  po: z.number().nullable(),
  pe: z.number().nullable(),
  result: z.number().nullable(),
  table: z.array(ZRangeLabel).nullable(),
});
const ZMetricInput = z.object({
  annotations: ZRichAnnotations,
  annotators: z.array(z.string()),
  tolerance: z.number(),
  contained: z.boolean(),
});

async function getNonAnnotations(
  annotations: RichAnnotation[],
  documentsData: z.infer<typeof ZDocumentData>,
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
  ctx: Context,
  task_id: number,
  label: string,
  documents: number[] | undefined,
  annotators: string[] | undefined
): Promise<any> {
  let query = ctx.supabase
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

export const metricsRouter = router({
  /* General Crud Definitions */

  'get_metrics': protectedProcedure
    .input(
      z.object({
        task_id: z.number(),
        label: z.string(),
        documents: z.array(z.number()),
        annotators: z.array(z.string()),
        annotatorsOrEmpty: z.array(z.string()),
        tolerance: z.number(),
        byWords: z.boolean(),
        hideNonText: z.boolean(),
        contained: z.boolean(),
        documentsData: ZDocumentData,
        documentsOptions: z.array(z.number()),
        annotations: ZRichAnnotations
      })
    )
    .query(async ({ctx, input}) => {
      
      const metrics = ["krippendorff", "fleiss_kappa", "cohens_kappa"] as const;

      const caller = appRouter.createCaller(ctx);

      let annotations: RichAnnotation[] = input.annotations ?? [];
    
      if (!annotations.length) {
        const ann_body = {
          task_id: input.task_id,
          label: input.label,
          documents: input.documents,
          annotators: input.annotatorsOrEmpty,
          byWords: input.byWords,
          hideNonText: input.hideNonText,
          documentsData: input.documentsData,
          documentsOptions: input.documentsOptions,
        };
    
        // annotations = await $fetch(`/api/metrics/get_annotations`, {
        //   method: "POST",
        //   body: ann_body,
        // });
        annotations = await caller.metrics.get_annotations(ann_body)
      }
    
      if (!annotations || annotations.length == 0) {
        return Promise.resolve(metrics.map((m) => newEmptyMetricResult(m)));
      }
    
      const metric_body = {
        annotations: annotations.filter((ann) => !ann.hidden),
        annotators: input.annotators,
        tolerance: input.tolerance,
        contained: input.contained,
      };
    
      const promises: Promise<MetricResult>[] = [];
      metrics.map((m) => {
        // promises.push(
        //   $fetch(`/api/metrics/${m}`, {
        //     method: "POST",
        //     body: metric_body,
        //   })
        // );
        promises.push(caller.metrics[m](metric_body))
      });
    
      return Promise.all(promises);
    }),

  'get_annotations': protectedProcedure
    .input(
      z.object({
        task_id: z.number(),
        label: z.string(),
        documents: z.array(z.number()),
        annotators: z.array(z.string()),
        byWords: z.boolean(),
        hideNonText: z.boolean(),
        documentsData: ZDocumentData,
        documentsOptions: z.array(z.number())
      })
    )
    .query(async ({ctx, input}) => {
      
      //   const documentsData = await findSharedDocumentsByTask(event, data.task_id);
      const annotations = await findAnnotationsByTaskLabelDocumentsAnnotators(
        ctx,
        input.task_id,
        input.label,
        input.documents,
        input.annotators
      );
    
      let result = [];
    
      result = await getNonAnnotations(
        annotations,
        input.documentsData,
        input.documentsOptions
      );
    
      if (input.byWords) {
        result = separateIntoWords(result);
      }
    
      if (input.hideNonText) {
        result = setTextToHidden(result, input.hideNonText);
      }
    
      return result;
    }),

  'krippendorff': protectedProcedure
    .input(ZMetricInput)
    .output(ZMetricResult)
    .query(() => { return {} as z.infer<typeof ZMetricResult>}),
  'fleiss_kappa': protectedProcedure
    .input(ZMetricInput)
    .output(ZMetricResult)
    .query(() => { return {} as z.infer<typeof ZMetricResult>}),
  'cohens_kappa': protectedProcedure
    .input(ZMetricInput)
    .output(ZMetricResult)
    .query(() => { return {} as z.infer<typeof ZMetricResult>}),

})

export type MetricsRouter = typeof metricsRouter