import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router, authorizer } from '~/server/trpc'
import { sortByDocumentAndRange, type RichAnnotation, type IaaInputData } from 'vue-iaa-metrics';
import { taskEditorAuthorizer } from '../authorizers';
import { buildTaskExportData } from '~/server/utils/task_export';
import { toIaaInputData } from '~/server/utils/iaa';

export const metricsRouter = router({
  // Builds the same data the IAA Go service needs as input. The metrics page
  // calls this once (on first Compute Metrics/Download All click) and caches
  // the result client-side, reusing it for subsequent calls instead of
  // re-querying here every time.
  get_input_data: protectedProcedure
    .input(z.object({ task_id: z.number() }))
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }): Promise<IaaInputData> => {
      const data = await buildTaskExportData(ctx.supabase, input.task_id);
      return toIaaInputData(data);
    }),

  get_annotations: protectedProcedure
    .input(
      z.object({
        task_id: z.number(),
        labels: z.array(z.string()).optional(),
        documents: z.array(z.number()).optional(),
        annotators: z.array(z.string()).optional(),
        intra: z.boolean().default(false),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from("annotations")
        .select(
          "id, start_index, end_index, label, text, confidence_rating, metadata, assignment:assignments!inner(task_id, document_id, original_task_id, document:documents(id, name), annotator:users!inner(email))"
        )
        .eq("assignments.task_id", input.task_id);

      if (input.labels?.length) query = query.in("label", input.labels);

      if (input.documents?.length)
        query = query.in("assignments.document_id", input.documents);

      if (input.annotators?.length)
        query = query.in("assignments.users.email", input.annotators);

      const { data, error } = await query;

      if (error)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in metrics.get_annotations: ${error.message}`,
        });

      const annotations = data.map((ann) => {
        return {
          start: ann.start_index!,
          end: ann.end_index!,
          text: ann.text!,
          label: ann.label!,
          annotator: input.intra
            ? `${ann.assignment!.original_task_id}-${ann.assignment!.annotator!.email}`
            : ann.assignment!.annotator!.email!,
          ann_id: ann.id,
          doc_id: String(ann.assignment!.document_id),
          doc_name: ann.assignment!.document!.name ?? undefined,
          confidence: ann.confidence_rating,
          metadata: ann.metadata ?? undefined,
        } satisfies RichAnnotation;
      });

      sortByDocumentAndRange(annotations);

      return annotations;
    }),
})

export type MetricsRouter = typeof metricsRouter
