import type {
  AnnotationFilters,
  DocumentOption,
  IaaInputData,
  IaaMetricsResponse,
  IaaParams,
  LabelOption,
  MetricsSource,
  RichAnnotation,
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

    async getAnnotators(): Promise<string[]> {
      const users = await $trpc.user.findUsersByTask.query(taskId);
      return users.map((u) => u.email!);
    },

    async getDocuments(): Promise<DocumentOption[]> {
      const docs = await $trpc.document.findDocumentsByTask.query(taskId);
      return docs.map((d) => ({ value: d.id.toString(), label: `${d.id} - ${d.name}` }));
    },

    async getAnnotations(filters: AnnotationFilters): Promise<RichAnnotation[]> {
      return $trpc.metrics.get_annotations.query({
        task_id: taskId,
        labels: filters.labels,
        documents: filters.documents.map(Number),
        annotators: filters.annotators,
      });
    },

    async getIaaInputData(): Promise<IaaInputData> {
      return $trpc.metrics.get_input_data.query({ task_id: taskId });
    },

    async computeMetrics(input: IaaInputData, params: IaaParams): Promise<IaaMetricsResponse> {
      return $fetch<IaaMetricsResponse>("/api/iaa/metrics", {
        method: "POST",
        body: JSON.stringify({ input, ...params }),
        timeout: 300000, // 5 minutes
      });
    },

    async downloadReport(input: IaaInputData, params: IaaParams): Promise<Blob> {
      return $fetch<Blob>("/api/iaa/report-zip", {
        method: "POST",
        body: JSON.stringify({ input, ...params }),
        timeout: 300000, // 5 minutes
        responseType: "blob",
      });
    },
  };
}
