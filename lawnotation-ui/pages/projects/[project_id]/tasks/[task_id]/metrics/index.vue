<template>
  <div v-if="task && project">
    <Breadcrumb :crumbs="[
      {
        name: 'Projects',
        link: '/projects',
      },
      {
        name: `Project ${project.name}`,
        link: `/projects/${project.id}`,
      },
      {
        name: `Task ${task.name}`,
        link: `/projects/${project.id}/tasks/${task.id}`,
      },
      {
        name: `Metrics`,
        link: `/projects/${project.id}/tasks/${task.id}/metrics`,
      },
    ]" />
    <div class="dimmer-wrapper">
      <Dimmer v-model="loading" />
      <div class="dimmer-content">
        <!-- left column -->
        <aside
          class="fixed left-0 z-40 w-80 side-panel-h transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700"
          aria-label="Sidebar" style="margin-top: inherit">
          <div class="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
            <ParametersColumn :labels-options="labelsOptions"
              :annotators-options="annotatorsOptions" :documents-options="documentsOptions"
              :showNonDocumentLevelAgreementParams="task && !isDocumentLevel(task)"
              v-model:selectedLabelsOrEmpty="selectedLabelsOrEmpty"
              v-model:selectedDocumentsOrEmpty="selectedDocumentsOrEmpty"
              v-model:selectedAnnotatorsOrEmpty="selectedAnnotatorsOrEmpty"
              v-model:contained="contained" v-model:wordGranularity="wordGranularity"
              @click-compute-metrics="clickComputeMetrics" @click-download-all="clickDownloadAll"
              @update-annotations="updateAnnotations">
            </ParametersColumn>
          </div>
        </aside>
        <AnnotationsList v-model:annotations="annotations" v-model:loading_annotations="loading_annotations"
          :labels="labelsOptions" :loading="loading"
          :documentUrl="`/projects/${project.id}/tasks/${task.id}/documents`"></AnnotationsList>
      </div>
    </div>
    <ResultsModal v-model:visible="metricsModalVisible" :metricResults="metricsResult"
      :labelsOptions="labelsOptions" :loading="computingMetrics"></ResultsModal>
  </div>
</template>
<script setup lang="ts">
import Breadcrumb from "~/components/Breadcrumb.vue";
import AnnotationsList from "~/components/metrics/AnnotationsList.vue";
import ResultsModal from "~/components/metrics/ResultsModal.vue";
import ParametersColumn from "~/components/metrics/ParametersColumn.vue";
import type { Task, Project } from "~/types";
import type { RichAnnotation } from "~/utils/metrics";
import type { IaaMetricsResponse } from "~/utils/iaa";
import { isDocumentLevel } from "~/utils/levels";
import Dimmer from "~/components/Dimmer.vue";
import fileSaver from "file-saver";
import { authorizeClient } from "~/utils/authorize.client";
import { confirmAnonymizeAnnotators } from "~/utils/confirmBox";

const saveAs = fileSaver.saveAs;

const { $toast, $trpc } = useNuxtApp();

const route = useRoute();
const task = ref<Task>();
const project = ref<Project>();

const downloading = ref(false);

// metrics
const metricsModalVisible = ref<boolean>(false);
const metricsResult = ref<IaaMetricsResponse>();
const computingMetrics = ref<boolean>(false);

// options
const loading_options = ref(false);

const labelsOptions = reactive<{ name: string, color: string }[]>([]);
const selectedLabelsOrEmpty = ref<string[]>([]);

const documentsOptions = reactive<{ value: string; label: string }[]>([]);
const selectedDocumentsOrEmpty = ref<string[]>([]);

const annotatorsOptions = reactive<string[]>([]);
const selectedAnnotatorsOrEmpty = ref<string[]>([]);

const wordGranularity = ref(false);
const contained = ref(false);

// annotations
const annotations_limit = 10 ** 6;
const loading_annotations = ref(false);
const annotations = reactive<RichAnnotation[]>([]);

// Only reflects state that actually affects the page behind the modal
// (sidebar/annotations list). Compute Metrics has its own loading state,
// shown inside ResultsModal itself - it must stay out of this, otherwise
// the page-level dimmer competes with the modal for the same screen space.
const loading = computed((): boolean => {
  return (loading_annotations.value ||
    downloading.value ||
    loading_options.value) as boolean;
});

const getAnnotations = async (
  task_id: number,
  labels: string[],
  documents: number[],
  annotators: string[],
  intra: boolean = false
) => {
  return $trpc.metrics.get_annotations.query({
    task_id,
    labels,
    documents,
    annotators,
    intra,
  });
};

const updateAnnotations = async () => {
  if (!task.value) {
    $toast.error("Task does not exist");
    throw new Error("Task does not exist");
  }

  loading_annotations.value = true;
  try {
    annotations.splice(0);
    const anns = await getAnnotations(
      task.value!.id,
      selectedLabelsOrEmpty.value!,
      selectedDocumentsOrEmpty.value!.map(Number),
      selectedAnnotatorsOrEmpty.value!
    );
    if (anns.length < annotations_limit) annotations.push(...anns);
    loading_annotations.value = false;
  } catch (error) {
    loading_annotations.value = false;
  }
};

// Compute Metrics / Download All always analyze the whole task - they
// ignore the filters above, which only affect what's browsable on the right.
//
// The input JSON the IAA service needs is only built once, on whichever of
// these two actions is clicked first, then cached here and reused for the
// rest of this page visit (a refresh/navigation drops the cache).
const cachedInput = ref<Awaited<ReturnType<typeof $trpc.metrics.get_input_data.query>>>();

const getIaaInput = async () => {
  if (!cachedInput.value) {
    cachedInput.value = await $trpc.metrics.get_input_data.query({ task_id: task.value!.id });
  }
  return cachedInput.value;
};

const iaaParams = () => ({
  criterion: contained.value ? "contained" : "exact",
  granularity: wordGranularity.value ? "word" : "char",
});

// Replaces each annotator email with a sequential number (first-seen order,
// starting at 1) so the downloaded report doesn't contain real emails.
const anonymizeAnnotators = (input: NonNullable<typeof cachedInput.value>) => {
  const indices = new Map<string, number>();
  return {
    ...input,
    documents: input.documents.map((doc) => ({
      ...doc,
      assignments: doc.assignments.map((ass) => {
        if (!indices.has(ass.annotator)) indices.set(ass.annotator, indices.size + 1);
        return { ...ass, annotator: indices.get(ass.annotator)! };
      }),
    })),
  };
};

const clickComputeMetrics = async () => {
  if (!task.value) {
    $toast.error("Task does not exist");
    throw new Error("Task does not exist");
  }
  metricsModalVisible.value = true;
  computingMetrics.value = true;
  try {
    const input = await getIaaInput();
    metricsResult.value = await $fetch<IaaMetricsResponse>("/api/iaa/metrics", {
      method: "POST",
      body: JSON.stringify({ input, ...iaaParams() }),
      timeout: 300000, // 5 minutes timeout
    });
  } catch (error) {
    $toast.error(`Failed to compute metrics: ${error}`);
  } finally {
    computingMetrics.value = false;
  }
};

const clickDownloadAll = async () => {
  if (!task.value) {
    $toast.error("Task does not exist");
    throw new Error("Task does not exist");
  }

  const anonymize = await confirmAnonymizeAnnotators();
  if (anonymize === undefined) return;

  downloading.value = true;
  try {
    const input = await getIaaInput();
    const blob = await $fetch<Blob>("/api/iaa/report-zip", {
      method: "POST",
      body: JSON.stringify({
        input: anonymize ? anonymizeAnnotators(input) : input,
        ...iaaParams(),
      }),
      timeout: 300000, // 5 minutes timeout
      responseType: "blob",
    });

    saveAs(blob, `${task.value.name}.zip`);
    $toast.success(`One .zip file has been downloaded!`);
  } finally {
    downloading.value = false;
  }
};

onMounted(async () => {
  loading_options.value = true;

  task.value = await $trpc.task.findById.query(+route.params.task_id);

  project.value = await $trpc.project.findById.query(+route.params.project_id);

  labelsOptions.push(
    ...(await $trpc.labelset.findById.query(+task.value.labelset_id)).labels
  );

  annotatorsOptions.push(
    ...(await $trpc.user.findUsersByTask.query(+task.value.id)).map((a) => a.email!)
  );

  documentsOptions.push(
    ...(await $trpc.document.findDocumentsByTask.query(+task.value.id)).map((d) => {
      return { value: d.id.toString(), label: d.id.toString() + " - " + d.name };
    })
  );

  loading_options.value = false;

  updateAnnotations();
});

definePageMeta({
  middleware: ["auth",
    async (to) => authorizeClient([["task", +to.params.task_id]]),
    async (to) => authorizeClient([["project", +to.params.project_id]])],
  layout: "wide",
});
</script>
<style>
button[disabled="disabled"],
button:disabled {
  cursor: not-allowed;
  background-color: rgb(229, 229, 229) !important;
  pointer-events: none;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.side-panel-h {
  height: calc(100vh - 141px);
}
</style>
