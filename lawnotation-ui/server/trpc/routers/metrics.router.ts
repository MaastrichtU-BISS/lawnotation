import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router, authorizer } from '~/server/trpc'
import type { AnnotationPage, RichAnnotation, IaaInputData } from 'vue-iaa-metrics';
import { taskEditorAuthorizer } from '../authorizers';
import { buildTaskExportData } from '~/server/utils/task_export';
import { toIaaInputData } from '~/server/utils/iaa';
import { hybridKindFilter } from '~/server/utils/annotation_kind_filter';
import { fetchRowsByIds } from '~/server/utils/fetch_all_rows';
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
      const data = await buildTaskExportData(ctx.supabase, input.task_id, { relations: false });
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
      const { data: task } = await ctx.supabase
        .from("tasks")
        .select("annotation_level, document_labelset_id")
        .eq("id", input.task_id)
        .single();
      const hybrid = !!task && isHybrid(task as any);

      const kindFilter = hybrid ? hybridKindFilter(input) : null;
      if (kindFilter === "nothing")
        return { annotations: [], total: 0, kinds: { spans: 0, documents: 0 } };

      // Applied alike to the page and to the per-kind counts.
      const matching = <Q extends { eq: Function; in: Function; or: Function }>(query: Q): Q => {
        let q = query.eq("task_id", input.task_id);
        if (input.documents?.length) q = q.in("document_id", input.documents);
        if (input.annotators?.length) q = q.in("annotator_email", input.annotators);
        if (!hybrid && input.labels?.length) q = q.in("label", input.labels);
        if (kindFilter) q = q.or(kindFilter);
        return q;
      };

      const fail = (what: string, message: string) =>
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in metrics.get_annotations (${what}): ${message}`,
        });

      const countOf = async (kind: "span" | "document") => {
        const { count, error } = await matching(
          ctx.supabase.from("metrics_annotation_rows").select("id", { count: "exact", head: true })
        ).eq("kind", kind);
        if (error) throw fail("count", error.message);
        return count ?? 0;
      };

      const [page, kinds] = await Promise.all([
        matching(
          ctx.supabase
            .from("metrics_annotation_rows")
            .select(
              "id, start_index, end_index, label, text, confidence_rating, metadata, kind, document_id, original_task_id, annotator_email",
              { count: "exact" }
            )
        )
          .order("document_id")
          // Document tags have no position; they head their document's group.
          .order("start_index", { nullsFirst: true })
          .order("end_index")
          .order("id")
          .range(input.offset, input.offset + input.limit - 1),
        hybrid
          ? Promise.all([countOf("span"), countOf("document")]).then(([spans, documents]) => ({ spans, documents }))
          : undefined,
      ]);
      if (page.error) throw fail("page", page.error.message);

      const documentIds = [...new Set(page.data.map((row) => row.document_id!))];
      const names = await fetchRowsByIds(documentIds, (ids, from, to) =>
        ctx.supabase.from("documents").select("id, name").in("id", ids).order("id").range(from, to)
      );
      if (names.error) throw fail("document names", names.error.message);
      const nameOf = new Map(names.data.map((d) => [d.id, d.name]));

      const annotations = page.data.map(
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

      return { annotations, total: page.count ?? annotations.length, ...(kinds ? { kinds } : {}) } satisfies AnnotationPage;
    }),
})

export type MetricsRouter = typeof metricsRouter
