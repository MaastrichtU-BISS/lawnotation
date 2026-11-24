import { TRPCError } from '@trpc/server';
import { z } from 'zod'
import { protectedProcedure, router, authorizer } from '~/server/trpc'
import type { AnnotationPage, RichAnnotation, IaaInputData } from 'vue-iaa-metrics';
import { taskEditorAuthorizer } from '../authorizers';
import { buildTaskExportData } from '~/server/utils/task_export';
import { toIaaInputData } from '~/server/utils/iaa';
import { hybridKindFilter, kindFilterSql } from '~/server/utils/annotation_kind_filter';
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

      const [task] = await ctx.sql<{ annotation_level: string | null; document_labelset_id: number | null }[]>`
        SELECT annotation_level, document_labelset_id FROM tasks WHERE id = ${input.task_id}
      `;
      const hybrid = !!task && isHybrid(task as any);

      const kindFilter = hybrid ? hybridKindFilter(input) : null;
      if (kindFilter === "nothing")
        return { annotations: [], total: 0, kinds: { spans: 0, documents: 0 } };

      // Applied alike to the page and to the per-kind counts.
      const matching = ctx.sql`
        task_id = ${input.task_id}
        ${input.documents?.length ? ctx.sql`AND document_id IN ${ctx.sql(input.documents)}` : ctx.sql``}
        ${input.annotators?.length ? ctx.sql`AND annotator_email IN ${ctx.sql(input.annotators)}` : ctx.sql``}
        ${!hybrid && input.labels?.length ? ctx.sql`AND label IN ${ctx.sql(input.labels)}` : ctx.sql``}
        ${kindFilter ? ctx.sql`AND ${kindFilterSql(ctx.sql, kindFilter)}` : ctx.sql``}
      `;

      type Row = {
        id: number;
        start_index: number | null;
        end_index: number | null;
        label: string | null;
        text: string | null;
        confidence_rating: number;
        metadata: string | null;
        kind: string;
        document_id: number | null;
        original_task_id: number | null;
        annotator_email: string | null;
      };

      const [page, counts] = await Promise.all([
        ctx.sql<Row[]>`
          SELECT id, start_index, end_index, label, text, confidence_rating, metadata, kind,
                 document_id, original_task_id, annotator_email
          FROM metrics_annotation_rows
          WHERE ${matching}
          -- Document tags have no position; they head their document's group.
          ORDER BY document_id, start_index NULLS FIRST, end_index, id
          LIMIT ${input.limit} OFFSET ${input.offset}
        `.catch((error) => {
          throw fail("page", error.message);
        }),
        ctx.sql<{ total: number; spans: number; documents: number }[]>`
          SELECT count(*)::int AS total,
                 (count(*) FILTER (WHERE kind = 'span'))::int AS spans,
                 (count(*) FILTER (WHERE kind = 'document'))::int AS documents
          FROM metrics_annotation_rows
          WHERE ${matching}
        `.catch((error) => {
          throw fail("count", error.message);
        }),
      ]);
      const { total, spans, documents } = counts[0]!;
      const kinds = hybrid ? { spans, documents } : undefined;

      const documentIds = [...new Set(page.map((row) => row.document_id!))];
      const names = documentIds.length
        ? await ctx.sql<{ id: number; name: string | null }[]>`
            SELECT id, name FROM documents WHERE id IN ${ctx.sql(documentIds)}
          `.catch((error) => {
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
