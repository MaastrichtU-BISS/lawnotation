import type {
  AnnotationFilters,
  AnnotationPage,
  DocumentOption,
  IaaInputData,
  IaaMetricsResponse,
  LabelOption,
  MetricsSource,
  PageRequest,
} from "vue-iaa-metrics";

// Implements vue-iaa-metrics' MetricsSource against Lawnotation's existing
// tRPC procedures and IAA proxy routes - none of that surface changes, this
// just adapts it to the package's contract.
export function createMetricsSource(taskId: number): MetricsSource {
  const { $trpc } = useNuxtApp();

  let cachedTask: Awaited<ReturnType<typeof $trpc.task.findById.query>> | undefined;
  const getTask = async () => {
    if (!cachedTask) cachedTask = await $trpc.task.findById.query(taskId);
    return cachedTask;
  };

  return {
    async getLabels(): Promise<LabelOption[]> {
      const task = await getTask();
      const labelset = await $trpc.labelset.findById.query(+task.labelset_id);
      return labelset.labels;
    },

    // Hybrid tasks only: the labelset of the whole-document tags.
    async getDocumentLabels(): Promise<LabelOption[]> {
      const task = await getTask();
      if (!task.document_labelset_id) return [];
      const labelset = await $trpc.labelset.findById.query(+task.document_labelset_id);
      return labelset.labels;
    },

    // In annotator-number order, so the page's A, B, C follow annotators 1, 2, 3.
    // Annotators without an account have no email and no annotations to show.
    async getAnnotators(): Promise<string[]> {
      const annotators = await $trpc.task.getAllAnnotatorsFromTask.query(taskId);
      return [...new Set(annotators.map((a) => a.email).filter((email): email is string => !!email))];
    },

    async getDocuments(): Promise<DocumentOption[]> {
      const docs = await $trpc.document.findDocumentsByTask.query(taskId);
      return docs.map((d) => ({ value: d.id.toString(), label: `${d.id} - ${d.name}` }));
    },

    async getAnnotations(filters: AnnotationFilters, page: PageRequest): Promise<AnnotationPage> {
      return $trpc.metrics.get_annotations.query({
        task_id: taskId,
        labels: filters.labels,
        document_labels: filters.documentLabels,
        no_span_labels: filters.noSpanLabels,
        no_document_labels: filters.noDocumentLabels,
        documents: filters.documents.map(Number),
        annotators: filters.annotators,
        offset: page.offset,
        limit: page.limit,
      });
    },

    async getIaaInputData(): Promise<IaaInputData> {
      return $trpc.metrics.get_input_data.query({ task_id: taskId });
    },

    async computeMetrics(input: IaaInputData): Promise<IaaMetricsResponse> {
      return $fetch<IaaMetricsResponse>("/api/iaa/metrics", {
        method: "POST",
        body: JSON.stringify({ input }),
        timeout: 300000, // 5 minutes
      });
    },

    async downloadReport(input: IaaInputData): Promise<Blob> {
      return $fetch<Blob>("/api/iaa/report-zip", {
        method: "POST",
        body: JSON.stringify({ input }),
        timeout: 300000, // 5 minutes
        responseType: "blob",
      });
    },
  };
}
