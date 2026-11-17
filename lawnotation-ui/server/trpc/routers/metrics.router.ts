import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router, authorizer } from '~/server/trpc'
import { sortByDocumentAndRange, type RichAnnotation, type IaaInputData } from 'vue-iaa-metrics';
import { taskEditorAuthorizer } from '../authorizers';
import { buildTaskExportData } from '~/server/utils/task_export';
import { toIaaInputData } from '~/server/utils/iaa';
import { isHybrid } from '~/utils/levels';

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
        // Hybrid tasks: `labels` narrows the span annotations and this the
        // document tags.
        document_labels: z.array(z.string()).optional(),
        // Hybrid tasks: "None" picked for a kind leaves that kind out.
        no_span_labels: z.boolean().optional(),
        no_document_labels: z.boolean().optional(),
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
      const { data: task } = await ctx.supabase
        .from("tasks")
        .select("annotation_level, document_labelset_id")
        .eq("id", input.task_id)
        .single();
      const hybrid = !!task && isHybrid(task as any);

      let query = ctx.supabase
        .from("annotations")
        .select(
          "id, start_index, end_index, label, text, confidence_rating, metadata, kind, assignment:assignments!inner(task_id, document_id, original_task_id, document:documents(id, name), annotator:users!inner(email))"
        )
        .eq("assignments.task_id", input.task_id);

      // A hybrid task has two labelsets, each filtered on its own kind of
      // annotation below; otherwise there is one labelset for everything.
      if (input.labels?.length && !hybrid) query = query.in("label", input.labels);

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

      const spanLabels = new Set(input.labels ?? []);
      const tagLabels = new Set(input.document_labels ?? []);
      const wanted = data.filter((ann) => {
        if (!hybrid) return true;
        const tags = ann.kind === "document";
        if (tags ? input.no_document_labels : input.no_span_labels) return false;
        const selected = tags ? tagLabels : spanLabels;
        return !selected.size || selected.has(ann.label!);
      });

      const annotations = wanted.map((ann) => {
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
          ...(hybrid ? { kind: ann.kind === "document" ? "document" : "span" } : {}),
        } satisfies RichAnnotation;
      });

      sortByDocumentAndRange(annotations);

      return annotations;
    }),
})

export type MetricsRouter = typeof metricsRouter
