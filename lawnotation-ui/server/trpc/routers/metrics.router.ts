import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router, authorizer } from '~/server/trpc'
import type { AnnotationPage, RichAnnotation, IaaInputData } from 'vue-iaa-metrics';
import { taskEditorAuthorizer } from '../authorizers';
import { buildTaskExportData } from '~/server/utils/task_export';
import { toIaaInputData } from '~/server/utils/iaa';
import { hybridKindFilter, kindFilterSql } from '~/server/utils/annotation_kind_filter';
import { isHybrid } from '~/utils/levels';
import * as M from '~/server/db/queries/metrics';

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
      const data = await buildTaskExportData(ctx.sql, input.task_id, { relations: false });
      return toIaaInputData(data);
    }),

  // One page of the filtered annotation list, in display order (by document,
  // then position), with how many match in all. Reads metrics_annotation_rows,
  // which reaches the task's annotations through its assignments; see the
  // migration that creates it.
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
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(1000).default(1000),
      })
    )
    .use((opts) =>
      authorizer(opts, () =>
        taskEditorAuthorizer(opts.input.task_id, opts.ctx.user.id, opts.ctx)
      )
    )
    .query(async ({ ctx, input }) => {
      const fail = (what: string, message: string) =>
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in metrics.get_annotations (${what}): ${message}`,
        });

      const task = await M.annotationKindsOfTask(ctx.sql, input.task_id);
      const hybrid = !!task && isHybrid(task as any);

      const kindFilter = hybrid ? hybridKindFilter(input) : null;
      if (kindFilter === "nothing")
        return { annotations: [], total: 0, kinds: { spans: 0, documents: 0 } };

      // Applied alike to the page and to the per-kind counts.
      const filter: M.MetricsRowFilter = {
        taskId: input.task_id,
        documents: input.documents,
        annotators: input.annotators,
        labels: hybrid ? undefined : input.labels,
        kindCondition: kindFilter ? kindFilterSql(ctx.sql, kindFilter) : null,
      };

      const [page, counts] = await Promise.all([
        M.metricsAnnotationPage(ctx.sql, filter, input.limit, input.offset).catch((error) => {
          throw fail("page", error.message);
        }),
        M.metricsAnnotationCounts(ctx.sql, filter).catch((error) => {
          throw fail("count", error.message);
        }),
      ]);
      const { total, spans, documents } = counts[0]!;
      const kinds = hybrid ? { spans, documents } : undefined;

      const documentIds = [...new Set(page.map((row) => row.document_id!))];
      const names = documentIds.length
        ? await M.documentNames(ctx.sql, documentIds).catch((error) => {
            throw fail("document names", error.message);
          })
        : [];
      const nameOf = new Map(names.map((d) => [d.id, d.name]));

      const annotations = page.map(
        (row) =>
          ({
            start: row.start_index!,
            end: row.end_index!,
            text: row.text!,
            label: row.label!,
            annotator: input.intra
              ? `${row.original_task_id}-${row.annotator_email}`
              : row.annotator_email!,
            ann_id: row.id!,
            doc_id: String(row.document_id),
            doc_name: nameOf.get(row.document_id!) ?? undefined,
            confidence: row.confidence_rating!,
            metadata: row.metadata ?? undefined,
            ...(hybrid ? { kind: row.kind === "document" ? "document" : "span" } : {}),
          }) satisfies RichAnnotation
      );

      return { annotations, total, ...(kinds ? { kinds } : {}) } satisfies AnnotationPage;
    }),
})

export type MetricsRouter = typeof metricsRouter
