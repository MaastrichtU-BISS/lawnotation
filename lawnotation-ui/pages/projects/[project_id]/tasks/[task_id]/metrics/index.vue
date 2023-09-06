<template>
  <div>
    <Breadcrumb
      v-if="task && project"
      :crumbs="[
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
      ]"
    />
    <div class="dimmer-wrapper pt-2">
      <DimmerProgress v-if="download_progress.loading" v-model="download_progress" />
      <Dimmer v-else v-model="loading" />
      <div class="dimmer-content">
        <aside
          id="logo-sidebar"
          class="fixed left-0 z-40 w-80 side-panel-h transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700"
          aria-label="Sidebar"
          style="margin-top: inherit"
        >
          <div class="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
            <ul class="space-y-2 text-sm">
              <li>
                <label
                  class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >Label</label
                >
                <Multiselect
                  v-model="selectedLabel"
                  :options="labelsOptions"
                  :searchable="true"
                  placeholder="Select a Label"
                  @change="selectLabel"
                />
              </li>
              <li>
                <label
                  class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >Document(s)</label
                >
                <Multiselect
                  v-model="selectedDocumentsOrEmpty"
                  :mode="'tags'"
                  :close-on-select="false"
                  :options="documentsOptions"
                  :searchable="true"
                  placeholder="All"
                  @change="selectDocument"
                />
              </li>
              <li>
                <label
                  class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >Annotators</label
                >
                <Multiselect
                  v-model="selectedAnnotatorsOrEmpty"
                  :options="annotatorsOptions"
                  :mode="'tags'"
                  :searchable="true"
                  :close-on-select="false"
                  placeholder="All"
                  @change="selectAnnotators"
                />
              </li>
              <li>
                <div>
                  <div class="flex justify-between">
                    <label
                      for="small-input"
                      class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                      >Tolerance</label
                    >
                    <InfoToolTip
                      :id="'tooltip_tolerance'"
                      :text="'A tolerance of 1 allows for small differences of one character while still considering them as agreements. Higher tolerance offers more flexibility in matching.'"
                    />
                  </div>
                  <input
                    type="number"
                    id="small-input"
                    v-model="tolerance"
                    min="0"
                    :max="10"
                    step="1"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  />
                </div>
              </li>
              <li>
                <div class="flex justify-between my-4">
                  <span>&nbsp;</span>
                  <label
                    class="relative grid grid-cols-[1fr_min-content_1fr] items-center cursor-pointer"
                  >
                    <span
                      class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300"
                      >Annotation</span
                    >
                    <input
                      type="checkbox"
                      value=""
                      class="sr-only peer"
                      @input="
                    ($event: Event) => {
                        modeToggle($event.target.checked);
                    }
                  "
                    />
                    <div
                      class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    ></div>
                    <span
                      class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300 justify-self-start"
                      >Word</span
                    >
                  </label>
                  <InfoToolTip
                    :id="'tooltip_annotation_word'"
                    :text="'Choose between comparing entire chunks with annotations or individual words\' annotations.'"
                  />
                </div>
              </li>
              <li>
                <div class="flex justify-between my-4">
                  <span>&nbsp;</span>
                  <label
                    class="relative grid grid-cols-[1fr_min-content_1fr] items-center cursor-pointer"
                  >
                    <span
                      class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300"
                      >Equal</span
                    >
                    <input
                      type="checkbox"
                      value=""
                      class="sr-only peer"
                      @input="
                        ($event: Event) => {
                            contained = !contained;
                            tolerance = 0;
                        }
                      "
                    />

                    <div
                      class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    ></div>
                    <span
                      class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300 justify-self-start"
                      >Overlap</span
                    >
                  </label>
                  <InfoToolTip
                    :id="'tooltip_equal_overlap'"
                    :text="`With \'Equal Overlap\', annotations must match exactly. With \'Overlapping Annotations\', any degree of overlap counts as agreement.`"
                  />
                </div>
              </li>
              <li>
                <div class="flex justify-between my-4">
                  <span>&nbsp;</span>
                  <label
                    class="h-full relative grid grid-cols-[1fr_min-content_1fr] items-center cursor-pointer"
                  >
                    <span
                      class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300"
                      >Include NTA</span
                    >
                    <input
                      type="checkbox"
                      value=""
                      :checked="hideNonText"
                      class="sr-only peer"
                      @input="
                    ($event: Event) => {
                      toggleTextToHidden($event?.target?.checked);
                    }
                  "
                    />

                    <div
                      class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    ></div>
                    <span
                      class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300 justify-self-start"
                      >Exclude NTA</span
                    >
                  </label>

                  <InfoToolTip
                    :id="'tooltip_nta'"
                    :text="'Decide whether to factor in non-text annotations (NTA) (e.g., \'. 2.\') that do not consist of regular text. When \'Include\' is chosen, these annotations contribute to agreement calculations. When \'Ignore\' is chosen, they are excluded from calculations.'"
                  />
                </div>
              </li>
              <li class="">
                <button
                  data-modal-target="difficultyMetricsModal"
                  data-modal-toggle="difficultyMetricsModal"
                  class="w-full flex justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                  @click="clickComputeDifficultyMetrics"
                >
                  Compute Difficulty Metrics
                </button>
              </li>
              <li>
                <button
                  :disabled="!selectedLabel"
                  class="w-full flex justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                  @click="clickComputeMetrics"
                >
                  Compute Annotation Metrics
                </button>
              </li>
              <ul
                class="pt-4 mt-4 space-y-2 font-medium pb-3 border-gray-200 dark:border-gray-700"
              >
                <li>
                  <div class="relative overflow-x-auto">
                    <table
                      class="w-full text-sm text-left text-gray-500 dark:text-gray-400"
                    >
                      <thead
                        class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
                      >
                        <tr>
                          <th scope="col" class="px-6 py-3">Metric</th>
                          <th scope="col" class="px-6 py-3">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          class="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                        >
                          <th
                            scope="row"
                            class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                          >
                            Krippendorff's alpha
                          </th>
                          <td class="px-6 py-4">
                            <span v-if="!loading">{{
                              metrics_result?.krippendorff?.result?.toFixed(3) ?? ""
                            }}</span>
                          </td>
                        </tr>
                        <tr
                          class="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                        >
                          <th
                            scope="row"
                            class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                          >
                            Fleiss' Kappa
                          </th>
                          <td class="px-6 py-4">
                            <span v-if="!loading">{{
                              metrics_result?.fleiss_kappa?.result?.toFixed(3) ?? ""
                            }}</span>
                          </td>
                        </tr>
                        <tr class="bg-white dark:bg-gray-800">
                          <th
                            scope="row"
                            class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                          >
                            Cohen's Kappa
                          </th>
                          <td class="px-6 py-4">
                            <span v-if="!loading">{{
                              metrics_result?.cohens_kappa?.result?.toFixed(3) ?? ""
                            }}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </li>
                <li class="">
                  <button
                    class="w-full flex justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                    @click="clickDownloadAll"
                  >
                    Compute and download all
                  </button>
                </li>
              </ul>
            </ul>
          </div>
        </aside>
        <div class="px-4 sm:ml-64 side-panel-h overflow-auto" style="margin-left: 20rem">
          <div id="annotations_list">
            <div v-if="!loading" class="flex mb-3 justify-between">
              <span class="flex-1 text-2xl font-bold text-center">
                Annotations: {{ annotations_length }}
              </span>
            </div>
            <ul>
              <li v-for="(ann, index) in annotations">
                <RangeLabelCmpt
                  :annotation="ann"
                  :index="index"
                  :is-new-doc="isNewDoc(index)"
                  :can-merge-up="canMergeUp(index)"
                  :can-merge-down="canMergeDown(index)"
                  :documentName="documentsData[ann.doc_id].name"
                  @separate="emitSeparate"
                  @mergeUp="emitMergeUp"
                  @mergeDown="emitMergeDown"
                  @set-hidden="emitSetHidden"
                  :key="index + '_' + ann.start + '_' + ann.end + '_' + ann.hidden"
                ></RangeLabelCmpt>
              </li>
            </ul>

            <a
              href="#annotations_list"
              type="button"
              class="absolute bottom-0 right-0 mb-3 mr-3 text-white bg-secondary hover:bg-secondary/80 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center mr-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              <svg
                class="w-4 h-4 text-white dark:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 10 14"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13V1m0 0L1 5m4-4 4 4"
                ></path>
              </svg>
              <span class="sr-only">Go up</span>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div
      id="difficultyMetricsModal"
      tabindex="-1"
      aria-hidden="true"
      class="fixed top-0 left-0 right-0 z-50 hidden w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full"
    >
      <div class="relative w-full max-w-2xl max-h-full">
        <!-- Modal content -->
        <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
          <!-- Modal header -->
          <div
            class="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600"
          >
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
              Difficulty Metrics
            </h3>
            <button
              type="button"
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
              data-modal-hide="difficultyMetricsModal"
            >
              <svg
                class="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span class="sr-only">Close modal</span>
            </button>
          </div>
          <!-- Modal body -->
          <div class="p-6 space-y-6">
            <div class="flex">
              <div
                v-for="(v, index) in metrics_result.difficulty?.values"
                :key="'mr_difficulty_' + index"
              >
                <div v-if="index > 0" class="mx-3">{{ index }} stars: {{ v }}</div>
              </div>
            </div>
            <div class="flex justify-between">
              <span>
                <div>
                  Rated: {{ metrics_result.difficulty?.rated }}/{{
                    metrics_result.difficulty?.total
                  }}
                </div>
                <div>Average: {{ metrics_result.difficulty?.average.toFixed(5) }}</div>
              </span>
              <span>
                <div>
                  Krippendorff's alpha:
                  {{ metrics_result.difficulty?.krippendorff?.result?.toFixed(5) }}
                </div>
                <div>
                  p0: {{ metrics_result.difficulty?.krippendorff?.po?.toFixed(5) }}
                </div>
                <div>
                  pe: {{ metrics_result.difficulty?.krippendorff?.pe?.toFixed(5) }}
                </div>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import * as XLSX from "xlsx";
import Multiselect from "@vueform/multiselect";
import { Task, useTaskApi } from "~/data/task";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { RichAnnotation, useAnnotationApi } from "~/data/annotation";
import { Document, useDocumentApi } from "~/data/document";
import { Labelset, useLabelsetApi } from "~/data/labelset";
import { Project, useProjectApi } from "~/data/project";
import { User, useUserApi } from "~/data/user";
import {
  MetricResult,
  newEmptyMetricResult,
  DifficultyMetricResult,
} from "~/utils/metrics";
import { initFlowbite } from "flowbite";

import _, { zip } from "lodash";
import DimmerProgress from "~/components/DimmerProgress.vue";
import Dimmer from "~/components/Dimmer.vue";
// const FileSaver = require("file-saver");
import { saveAs } from "file-saver";
import JSZip, { file } from "jszip";

const config = useRuntimeConfig();
const { $toast } = useNuxtApp();

// const user = useSupabaseUser();
const taskApi = useTaskApi();
const projectApi = useProjectApi();
const annotationApi = useAnnotationApi();
const documentApi = useDocumentApi();
const labelsetApi = useLabelsetApi();
const userApi = useUserApi();

const route = useRoute();
const task = ref<Task>();
const project = ref<Project>();

const documentsOptions = reactive<{ value: string; label: string }[]>([]);
const selectedDocumentsOrEmpty = ref<string[]>([]);

const annotatorsOptions = reactive<string[]>([]);
const selectedAnnotatorsOrEmpty = ref<string[]>([]);

const labelsOptions = reactive<string[]>([]);
const selectedLabel = ref<string>();

const tolerance = ref<number>(0);

const loading_annotations = ref(false);
const loading_options = ref(false);
const download_progress = ref<{ current: number; total: number; loading: boolean }>({
  current: 0,
  total: 0,
  loading: false,
});
const downloadAllPromises = [];
const downloadAllResults = [];
const separate_into_words = ref(false);
const hideNonText = ref(true);
const contained = ref(false);

const annotations_limit = 10 ** 3;
const annotations_length = ref(0);
const annotations = reactive<RichAnnotation[]>([]);
const metrics_result = ref<{
  loading: Boolean;
  krippendorff: MetricResult | undefined;
  fleiss_kappa: MetricResult | undefined;
  cohens_kappa: MetricResult | undefined;
  difficulty: DifficultyMetricResult | undefined;
}>({
  krippendorff: undefined,
  fleiss_kappa: undefined,
  cohens_kappa: undefined,
  difficulty: undefined,
  loading: false,
});

const documentsData = ref<any>({});

const loading = computed((): boolean => {
  return (loading_annotations.value ||
    download_progress.value.loading ||
    metrics_result.value?.loading ||
    loading_options.value) as boolean;
});

const selectedAnnotators = computed((): string[] => {
  return selectedAnnotatorsOrEmpty.value && selectedAnnotatorsOrEmpty.value.length
    ? selectedAnnotatorsOrEmpty.value
    : annotatorsOptions;
});

const selectedDocuments = computed((): string[] => {
  return selectedDocumentsOrEmpty.value && selectedDocumentsOrEmpty.value.length
    ? selectedDocumentsOrEmpty.value
    : documentsOptions.map((d) => d.value);
});

const selectLabel = (value: string) => {
  selectedLabel.value = value;
  selectAnnotators();
};

const selectDocument = () => {
  selectAnnotators();
};

const selectAnnotators = async () => {
  if (!task.value) {
    $toast.error(`Invalid Task`);
    return;
  }
  if (!selectedLabel.value) {
    return;
  }

  nextTick(() => {
    updateAnnotations();
  });
};

const getAnnotations = async (
  task_id: string,
  label: string,
  documents: string[],
  annotators: string[],
  byWords: boolean,
  hideNonText: boolean
) => {
  const body = JSON.stringify({
    task_id: task_id,
    label: label,
    documents: documents,
    annotators: annotators,
    byWords: byWords,
    hideNonText: hideNonText,
  });

  return $fetch("/api/metrics/get_annotations", {
    method: "POST",
    body: body,
  });
};

const updateAnnotations = async () => {
  loading_annotations.value = true;
  metrics_result.value = {
    krippendorff: undefined,
    fleiss_kappa: undefined,
    cohens_kappa: undefined,
    difficulty: undefined,
    loading: false,
  };
  annotations.splice(0);
  const anns = await getAnnotations(
    task.value?.id.toString()!,
    selectedLabel.value!,
    selectedDocumentsOrEmpty.value!,
    selectedAnnotatorsOrEmpty.value!,
    separate_into_words.value,
    hideNonText.value
  );
  annotations_length.value = anns.length;
  if (anns.length < annotations_limit) annotations.push(...anns);
  loading_annotations.value = false;
};

const compute_metrics = async (
  task_id: string,
  label: string,
  documents: string[],
  annotators: string[],
  annotatorsOrEmpty: string[],
  tolerance: number,
  byWords: boolean,
  hideNonText: boolean,
  contained: boolean,
  documentsData: any,
  documentsOptions: string[],
  annotations: RichAnnotation[] = []
): Promise<MetricResult[]> => {
  const body = JSON.stringify({
    task_id: task_id,
    label: label,
    documents: documents,
    annotators: annotators,
    annotatorsOrEmpty: annotatorsOrEmpty,
    tolerance: tolerance,
    byWords: byWords,
    hideNonText: hideNonText,
    contained: contained,
    documentsData: documentsData,
    documentsOptions: documentsOptions,
    annotations: annotations,
  });

  return $fetch(`/api/metrics/get_metrics`, {
    method: "POST",
    body: body,
  });
};

const updateMetrics = (metrics: MetricResult[]) => {
  metrics.map((m) => {
    (metrics_result.value as any)[m.name] = m;
  });
};

const clickComputeMetrics = async () => {
  if (!selectedLabel.value) return;
  metrics_result.value = {
    krippendorff: undefined,
    fleiss_kappa: undefined,
    cohens_kappa: undefined,
    difficulty: metrics_result.value?.difficulty ?? undefined,
    loading: true,
  };
  try {
    const metrics = await compute_metrics(
      task.value?.id.toString()!,
      selectedLabel.value,
      selectedDocumentsOrEmpty.value,
      selectedAnnotators.value,
      selectedAnnotatorsOrEmpty.value,
      tolerance.value,
      separate_into_words.value,
      hideNonText.value,
      contained.value,
      documentsData.value,
      documentsOptions.map((d) => d.value),
      annotations && annotations.length ? annotations : []
    );
    updateMetrics(metrics);
    metrics_result.value.loading = false;
  } catch (error) {
    metrics_result.value.loading = false;
  }
};

const clickComputeDifficultyMetrics = async () => {
  metrics_result.value = {
    krippendorff: metrics_result.value?.krippendorff ?? undefined,
    fleiss_kappa: metrics_result.value?.fleiss_kappa ?? undefined,
    cohens_kappa: metrics_result.value?.cohens_kappa ?? undefined,
    difficulty: undefined,
    loading: true,
  };
  try {
    const metric = await computeDifficultyMetrics(
      task.value?.id.toString()!,
      selectedAnnotators.value.length,
      selectedAnnotatorsOrEmpty.value,
      selectedDocumentsOrEmpty.value
    );
    metrics_result.value.difficulty = metric;
    metrics_result.value.loading = false;
  } catch (error) {
    metrics_result.value.loading = false;
  }
};

const computeDifficultyMetrics = async (
  task_id: string,
  annotators_length: number,
  annotators: string[],
  documents: string[]
): Promise<DifficultyMetricResult> => {
  const body = JSON.stringify({
    annotators_length: annotators_length,
    task_id: task_id,
    annotators: annotators,
    documents: documents,
  });

  return $fetch(`/api/metrics/difficulty`, {
    method: "POST",
    body: body,
  });
};

const clickDownloadAll = async () => {
  download_progress.value.loading = true;
  try {
    const blobs = await download_all({
      task_id: task.value?.id.toString()!,
      labelsOptions: labelsOptions,
      documents: selectedDocuments.value,
      documentsOrEmpty: selectedDocumentsOrEmpty.value,
      annotators: selectedAnnotators.value,
      annotatorsOrEmpty: selectedAnnotatorsOrEmpty.value,
      tolerance: tolerance.value,
      byWords: separate_into_words.value,
      hideNonText: hideNonText.value,
      contained: contained.value,
      documentsData: documentsData.value,
      documentsOptions: documentsOptions.map((d) => d.value),
    });
    console.log(blobs);
    const zip = JSZip();
    for (let i = 0; i < blobs.length; i++) {
      const b = await (await fetch(blobs[i].wb)).blob();
      zip.file(`${blobs[i].name}`, b);
    }
    const blob_zip = await zip.generateAsync({ type: "blob" });
    saveAs(blob_zip, `${task.value?.name}.zip`);
    download_progress.value.loading = false;
    $toast.success(`One .zip file has been downloaded!`);
  } catch (error) {
    download_progress.value.loading = false;
  }
};

async function download_all(data: any) {
  let results: { wb: string; name: string }[] = [];
  download_progress.value.current = 0;
  download_progress.value.total =
    selectedDocuments.value.length * labelsOptions.length * 2 + labelsOptions.length * 2;
  try {
    try {
      const workbookDifficulty = XLSX.utils.book_new();
      const diff_metric_body = JSON.stringify({
        task_id: data.task_id,
        annotators_length: data.annotators.length,
        annotators: data.annotatorOrEmpty,
        documents: data.documentsOrEmpty,
      });

      const dm = await $fetch("/api/metrics/difficulty", {
        method: "POST",
        body: diff_metric_body,
      });
      const worksheetDifficulty = XLSX.utils.json_to_sheet([
        {
          total: dm.total,
          rated: dm.rated,
          average_stars: dm.average,
          "1_stars": dm.values[1],
          "2_stars": dm.values[2],
          "3_stars": dm.values[3],
          "4_stars": dm.values[4],
          "5_stars": dm.values[5],
          krippendorff: dm.krippendorff?.result,
          p0: dm.krippendorff?.po,
          pe: dm.krippendorff?.pe,
        },
      ]);
      XLSX.utils.book_append_sheet(
        workbookDifficulty,
        worksheetDifficulty,
        "Difficulty Metrics"
      );
      results.push({
        wb: getZippeableBlob(workbookDifficulty),
        name: `_confidence.xlsx`,
      });
      download_progress.value.current++;
    } catch (error) {}
    for (let i = 0; i < data.documents.length; i++) {
      const document = data.documents[i];
      const workbookMetrics = XLSX.utils.book_new();
      const workbookAnnotations = XLSX.utils.book_new();
      for (let j = 0; j < data.labelsOptions.length; j++) {
        const label = data.labelsOptions[j];
        const sheets: XLSX.WorkSheet[] = await getXlslTab(
          data.task_id,
          label,
          [document],
          data.annotators,
          data.annotatorsOrEmpty,
          data.tolerance,
          data.byWords,
          data.hideNonText,
          data.contained,
          data.documentsData,
          data.documentsOptions
        );
        XLSX.utils.book_append_sheet(workbookMetrics, sheets[0], label);
        XLSX.utils.book_append_sheet(workbookAnnotations, sheets[1], label);
        download_progress.value.current += 2;
      }
      const filename = document + "-" + data.documentsData[document].name.split(".")[0];
      results.push({
        wb: getZippeableBlob(workbookMetrics),
        name: `${filename}_metrics.xlsx`,
      });

      results.push({
        wb: getZippeableBlob(workbookAnnotations),
        name: `${filename}_annotations.xlsx`,
      });
    }

    const workbookMetrics = XLSX.utils.book_new();
    const workbookAnnotations = XLSX.utils.book_new();
    for (let i = 0; i < data.labelsOptions.length; i++) {
      const label = data.labelsOptions[i];
      const sheets = await getXlslTab(
        data.task_id,
        label,
        data.documentsOrEmpty,
        data.annotators,
        data.annotatorsOrEmpty,
        data.tolerance,
        data.byWords,
        data.hideNonText,
        data.contained,
        data.documentsData,
        data.documentsOptions
      );
      XLSX.utils.book_append_sheet(workbookMetrics, sheets[0], label);
      XLSX.utils.book_append_sheet(workbookAnnotations, sheets[1], label);
      download_progress.value.current += 2;
    }
    results.push({
      wb: getZippeableBlob(workbookMetrics),
      name: `_metrics.xlsx`,
    });

    results.push({
      wb: getZippeableBlob(workbookAnnotations),
      name: `_annotations.xlsx`,
    });
    return results;
  } catch (error) {}
  return [];
}

async function getXlslTab(
  task_id: string,
  label: string,
  documents: string[],
  annotators: string[],
  annotatorsOrEmpty: string[],
  tolerance: number,
  byWords: boolean,
  hideNonText: boolean,
  contained: boolean,
  documentsData: any,
  documentsOptions: string[]
) {
  const rowsMetrics: any[] = [];
  const rowsAnnotations: any[] = [];

  let timeout = 100;
  // while (true) {
  try {
    const metric_body = JSON.stringify({
      task_id: task_id,
      label: label,
      documents: documents,
      annotators: annotators,
      annotatorsOrEmpty: annotatorsOrEmpty,
      tolerance: tolerance,
      byWords: byWords,
      hideNonText: hideNonText,
      contained: contained,
      documentsData: documentsData,
      documentsOptions: documentsOptions,
    });
    console.log(label, documents, annotators);
    const metrics = await $fetch("/api/metrics/get_metrics", {
      method: "POST",
      body: metric_body,
    });
    console.log("XXX");
    metrics.map((m) => {
      if (m.result !== undefined)
        rowsMetrics.push({
          metric: m.name,
          annotators: annotators.length > 2 ? "all" : annotators.join(","),
          value: m.result,
          p0: m.po,
          pe: m.pe,
          tolerance: tolerance,
          consider_contained: contained ? "yes" : "no",
        });
    });
    const tables = annotators.length > 2 ? metrics[0].table : metrics[2].table;
    tables?.forEach((r: any) => {
      Object.entries(r.annotators).forEach(([k, v]) => {
        const ann = {
          annotator: k,
          start: r.start,
          end: r.end,
          text: r.text,
          value: v,
        };

        rowsAnnotations.push(
          documents.length != 1
            ? {
                document: r.doc_id + "-" + documentsData[r.doc_id].name,
                ...ann,
              }
            : ann
        );
      });
    });
    // break;
  } catch (error) {
    timeout--;
    console.log("FAILED", error);
  }
  // }

  if (annotators.length > 2) {
    for (let i = 0; i < annotators.length; i++) {
      for (let j = i + 1; j < annotators.length; j++) {
        let ck_timeout = 100;
        // while (true) {
        try {
          const metric_body = JSON.stringify({
            task_id: task_id,
            label: label,
            documents: documents,
            annotators: [annotators[i], annotators[j]],
            annotatorsOrEmpty: [annotators[i], annotators[j]],
            tolerance: tolerance,
            byWords: byWords,
            hideNonText: hideNonText,
            contained: contained,
            documentsData: documentsData,
            documentsOptions: documentsOptions,
          });

          const ck_metrics = await $fetch("/api/metrics/get_metrics", {
            method: "POST",
            body: metric_body,
          });

          ck_metrics.map((m) => {
            if (m.name == "cohens_kappa") {
              rowsMetrics.push({
                metric: m.name,
                annotators: annotators[i] + "," + annotators[j],
                value: m.result,
                p0: m.po,
                pe: m.pe,
                tolerance: tolerance,
                consider_contained: contained ? "yes" : "no",
              });
            }
          });
          // break;
        } catch (error) {
          ck_timeout--;
          console.log("FAILED", error);
        }
        // }
      }
    }
  }

  const worksheetMetrics = XLSX.utils.json_to_sheet(rowsMetrics);
  const worksheetAnnotations = XLSX.utils.json_to_sheet(rowsAnnotations);
  return [worksheetMetrics, worksheetAnnotations];
}

function getZippeableBlob(workBook: XLSX.WorkBook) {
  const b64Data = XLSX.write(workBook, {
    bookType: "xlsx",
    type: "base64",
    compression: true,
  });

  const contentType = "application/octet-stream";

  return `data:${contentType};base64,${b64Data}`;
}

const canMergeUp = (index: number): Boolean => {
  return (
    index > 0 &&
    annotations[index - 1].doc_id == annotations[index].doc_id &&
    annotations[index - 1].ann_id == annotations[index].ann_id
  );
};

const canMergeDown = (index: number): Boolean => {
  return (
    index < annotations.length - 1 &&
    annotations[index + 1].doc_id == annotations[index].doc_id &&
    annotations[index + 1].ann_id == annotations[index].ann_id
  );
};

const isNewDoc = (index: number): Boolean => {
  return (
    index == 0 ||
    (index > 0 && annotations[index - 1].doc_id != annotations[index].doc_id)
  );
};

const emitSeparate = (ann_index: number, split_pos: number) => {
  loading_annotations.value = true;
  const current = _.clone(annotations[ann_index]);

  annotations[ann_index].end = current.start + split_pos;
  annotations[ann_index].text = current.text.substring(0, split_pos);

  annotations.splice(ann_index + 1, 0, {
    start: current.start + split_pos,
    end: current.end,
    label: current.label,
    text: current.text.substring(split_pos, current.end),
    annotator: current.annotator,
    hidden: false,
    ann_id: current.ann_id,
    doc_id: current.doc_id,
  });
  loading_annotations.value = false;
};

const modeToggle = (value: boolean) => {
  separate_into_words.value = value;
  if (!task.value) {
    return;
  }
  if (!selectedLabel.value) {
    return;
  }
  updateAnnotations();
};

const emitMergeUp = (ann_index: number): void => {
  loading_annotations.value = true;
  const current = _.clone(annotations[ann_index]);
  const previous = _.clone(annotations[ann_index - 1]);

  annotations[ann_index - 1].end = current.end;
  annotations[ann_index - 1].text = documentsData.value[
    current.doc_id
  ].full_text.substring(previous.start, current.end);

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
  loading_annotations.value = false;
};

const emitMergeDown = (ann_index: number): void => {
  loading_annotations.value = true;
  const current = _.clone(annotations[ann_index]);
  const next = _.clone(annotations[ann_index + 1]);

  annotations[ann_index + 1].start = current.start;
  annotations[ann_index + 1].text = documentsData.value[
    current.doc_id
  ].full_text.substring(current.start, next.end);

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
  loading_annotations.value = false;
};

const toggleTextToHidden = (value: boolean): RichAnnotation[] => {
  hideNonText.value = value;
  return setTextToHidden(annotations, value);
};

const emitSetHidden = (ann_index: number, hidden: Boolean): void => {
  annotations[ann_index].hidden = hidden;
};

onMounted(async () => {
  initFlowbite();

  loading_options.value = true;

  task.value = await taskApi.findTask(route.params.task_id.toString());

  project.value = await projectApi.findProject(route.params.project_id as string);

  labelsOptions.push(
    ...(await labelsetApi.findLabelset(task.value.labelset_id.toString())).labels.map(
      (l) => l.name
    )
  );

  documentsOptions.push(
    ...(await documentApi.findSharedDocumentsByTask(task.value.id.toString())).map(
      (d) => {
        if (!(d.id in documentsData.value)) {
          documentsData.value[d.id] = { full_text: d.full_text, name: d.name };
        }
        return { value: d.id.toString(), label: d.id.toString() + " - " + d.name };
      }
    )
  );

  annotatorsOptions.push(
    ...(await userApi.findUsersByTask(task.value.id.toString())).map((a) => a.email)
  );

  loading_options.value = false;
});

definePageMeta({
  middleware: ["auth"],
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
