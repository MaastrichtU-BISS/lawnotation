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
      <Dimmer v-model="loading" />
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
                  v-model="selectedDocuments"
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
                  v-model="selectedAnnotators"
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
                  <label
                    for="small-input"
                    class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                    >Tolerance</label
                  >
                  <input
                    type="number"
                    id="small-input"
                    v-model="tolerance"
                    min="0"
                    max="10"
                    step="1"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  />
                </div>
              </li>
              <li>
                <div class="text-center flex justify-center my-4">
                  <label
                    class="relative grid grid-cols-[1fr_min-content_1fr] items-center cursor-pointer"
                  >
                    <span
                      class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300"
                      >Annotations</span
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
                      >Words</span
                    >
                  </label>
                </div>
              </li>
              <li>
                <button
                  :disabled="
                    !selectedDocuments ||
                    !selectedLabel ||
                    selectedAnnotators?.length == 1
                  "
                  class="w-full flex justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                  @click="compute_metrics(annotations, selectedAnnotators!, tolerance)"
                >
                  Compute Metrics
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
                    @click="downloadAll"
                  >
                    Compute and download all
                  </button>
                </li>
              </ul>
            </ul>
          </div>
        </aside>
        <div class="px-4 sm:ml-64 side-panel-h relative" style="margin-left: 20rem">
          <div class="">
            <div v-if="!loading && annotations && annotations.length">
              <h3 class="text-2xl font-bold mb-4 text-center">
                Annotations: {{ annotations.length }}
              </h3>
              <ul>
                <li v-for="(ann, index) in annotations">
                  <RangeLabelCmpt
                    :annotation="ann"
                    :index="index"
                    :is-new-doc="isNewDoc(index)"
                    :can-merge-up="canMergeUp(index)"
                    :can-merge-down="canMergeDown(index)"
                    @separate="emitSeparate"
                    @mergeUp="emitMergeUp"
                    @mergeDown="emitMergeDown"
                    @set-hidden="emitSetHidden"
                    :key="index + '_' + ann.start + '_' + ann.end + '_' + ann.hidden"
                  ></RangeLabelCmpt>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import * as XLSX from "xlsx";
import JSZip from "jszip";
import Multiselect from "@vueform/multiselect";
import { Task, useTaskApi } from "~/data/task";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { RichAnnotation, useAnnotationApi } from "~/data/annotation";
import { Document, useDocumentApi } from "~/data/document";
import { Labelset, useLabelsetApi } from "~/data/labelset";
import { Project, useProjectApi } from "~/data/project";
import { User, useUserApi } from "~/data/user";
import { MetricResult, RangeLabel, sortByRange } from "~/utils/metrics";
import { initFlowbite } from "flowbite";

import _ from "lodash";

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
const selectedDocuments = ref<string[]>();

const annotatorsOptions = reactive<string[]>([]);
const selectedAnnotators = ref<string[]>();

const labelsOptions = reactive<string[]>([]);
const selectedLabel = ref<string>();

const tolerance = ref<number>(0);

const loading_annotations = ref(false);
const loading_download = ref(false);
const separate_into_words = ref(false);

const annotations = reactive<RichAnnotation[]>([]);
const metrics_result = ref<{
  loading: Boolean;
  krippendorff: MetricResult | undefined;
  fleiss_kappa: MetricResult | undefined;
  cohens_kappa: MetricResult | undefined;
}>({
  krippendorff: undefined,
  fleiss_kappa: undefined,
  cohens_kappa: undefined,
  loading: false,
});

const loading = computed(() => {
  return (
    loading_annotations.value || loading_download.value || metrics_result.value?.loading
  );
});

const setSelectedDocumentsAndAnnotators = () => {
  return nextTick(() => {
    if (!selectedDocuments.value || selectedDocuments.value.length == 0) {
      selectedDocuments.value = [];
      selectedDocuments.value?.push(...documentsOptions.map((d) => d.value));
    }

    if (!selectedAnnotators.value || selectedAnnotators.value.length == 0) {
      selectedAnnotators.value = [];
      selectedAnnotators.value?.push(...annotatorsOptions);
    }
  });
};

const selectLabel = (value: string) => {
  if (!task.value) {
    $toast.error(`Invalid Task`);
    return;
  }
  selectedLabel.value = value;
  setSelectedDocumentsAndAnnotators().then((r) => {
    getAnnotations(
      task.value?.id.toString()!,
      selectedLabel.value!,
      selectedDocuments.value!,
      selectedAnnotators.value!
    );
  });
};

const selectDocument = (value: any) => {
  if (!task.value) {
    $toast.error(`Invalid Task`);
    return;
  }
  if (!selectedLabel.value) {
    return;
  }
  selectedDocuments.value = [];
  selectedDocuments.value.push(...value);
  setSelectedDocumentsAndAnnotators().then((r) => {
    getAnnotations(
      task.value?.id.toString()!,
      selectedLabel.value!,
      selectedDocuments.value!,
      selectedAnnotators.value!
    );
  });
};

const selectAnnotators = (value: any) => {
  if (!task.value) {
    $toast.error(`Invalid Task`);
    return;
  }
  if (!selectedLabel.value) {
    return;
  }
  selectedAnnotators.value = [];
  selectedAnnotators.value.push(...value);
  setSelectedDocumentsAndAnnotators().then((r) => {
    getAnnotations(
      task.value?.id.toString()!,
      selectedLabel.value!,
      selectedDocuments.value!,
      selectedAnnotators.value!
    );
  });
};

const getAnnotations = async (
  task_id: string,
  label: string,
  documents: string[],
  annotators: string[]
) => {
  loading_annotations.value = true;
  metrics_result.value = {
    krippendorff: undefined,
    fleiss_kappa: undefined,
    cohens_kappa: undefined,
    loading: false,
  };
  try {
    let result = [];
    for (let i = 0; i < documents.length; i++) {
      const anns = await annotationApi.findAnnotationsByTaskAndDocumentAndLabelsAndAnnotators(
        task_id,
        documents[i],
        label,
        annotators
      );
      const annsAndNans = await getNonAnnotations(anns);
      result.push(...annsAndNans);
    }

    if (separate_into_words.value) {
      result = separateIntoWords(result);
    }

    annotations.splice(0) && annotations.push(...result);

    loading_annotations.value = false;
  } catch (error) {
    console.log(error);
    loading_annotations.value = false;
  }
};

const getNonAnnotations = async (annotations: RichAnnotation[]) => {
  if (!annotations || !annotations.length) return [];
  sortByRange(annotations);
  var new_annotations: RichAnnotation[] = [];
  var last_end: number = 0;
  var previous_ann = annotations[0];
  for (let i = 0; i < annotations.length; ++i) {
    var current_ann = annotations[i];
    if (last_end < current_ann.start) {
      new_annotations.push({
        start: last_end,
        end: current_ann.start,
        label: "NOT ANNOTATED",
        text: current_ann.doc_text.substring(last_end, current_ann.start),
        annotator: "",
        hidden: false,
        ann_id: -1,
        doc_id: current_ann.doc_id,
        doc_name: current_ann.doc_name,
        doc_text: current_ann.doc_text,
      });
    }
    new_annotations.push(current_ann);
    last_end = Math.max(last_end, current_ann.end);
    previous_ann = current_ann;
  }
  new_annotations.push({
    start: last_end,
    end: previous_ann.doc_text.length,
    label: "NOT ANNOTATED",
    text: previous_ann.doc_text.substring(last_end, previous_ann.doc_text.length),
    annotator: "",
    hidden: false,
    ann_id: -1,
    doc_id: previous_ann.doc_id,
    doc_name: previous_ann.doc_name,
    doc_text: previous_ann.doc_text,
  });
  return new_annotations;
};

const compute_metrics = async (
  annotations: RichAnnotation[],
  annotators: string[],
  tolerance: number
) => {
  metrics_result.value = {
    krippendorff: undefined,
    fleiss_kappa: undefined,
    cohens_kappa: undefined,
    loading: false,
  };

  if (!annotations || annotations.length == 0) {
    // $toast.error(`There are no annotations!`);
    return;
  }

  metrics_result.value.loading = true;

  const body = JSON.stringify({
    annotations: annotations.filter((x) => !x.hidden),
    annotators: annotators,
    tolerance: tolerance,
  });

  if (annotators.length > 2) {
    const ka = await $fetch(`/api/metrics/krippendorff`, {
      method: "POST",
      body: body,
    });

    metrics_result.value.krippendorff = ka as MetricResult;

    const fk = await $fetch(`/api/metrics/fleiss_kappa`, {
      method: "POST",
      body: body,
    });

    metrics_result.value.fleiss_kappa = fk as MetricResult;
  } else if (annotators.length == 2) {
    const ck = await $fetch(`/api/metrics/cohens_kappa`, {
      method: "POST",
      body: body,
    });

    metrics_result.value.cohens_kappa = ck as MetricResult;
  }

  metrics_result.value.loading = false;
};

const getXlslTab = async (
  task_id: string,
  label: string,
  documents: string[],
  annotators: string[],
  tolerance: number
) => {
  await getAnnotations(task_id, label, documents, annotators);

  await compute_metrics(annotations, annotators, tolerance);
  const rowsMetrics = [
    {
      metric: "Krippendorff's alpha",
      annotators: "all",
      value: metrics_result.value.krippendorff?.result,
      p0: metrics_result.value.krippendorff?.po,
      pe: metrics_result.value.krippendorff?.pe,
      tolerance: tolerance,
    },
    {
      metric: "Fleiss' kappa",
      annotators: "all",
      value: metrics_result.value.fleiss_kappa?.result,
      p0: metrics_result.value.fleiss_kappa?.po,
      pe: metrics_result.value.fleiss_kappa?.pe,
      tolerance: tolerance,
    },
  ];

  const rowsAnnotations: any[] = [];
  metrics_result.value?.krippendorff?.table.forEach((r: any) => {
    Object.entries(r.annotators).forEach(([k, v]) => {
      rowsAnnotations.push({
        document: r.doc_id + "-" + r.doc_name,
        annotator: k,
        start: r.start,
        end: r.end,
        text: r.text,
        value: v,
      });
    });
  });

  for (let i = 0; i < annotators.length; i++) {
    for (let j = i + 1; j < annotators.length; j++) {
      await compute_metrics(annotations, [annotators[i], annotators[j]], tolerance);
      rowsMetrics.push({
        metric: "Cohen's kappa",
        annotators: annotators[i] + "," + annotators[j],
        value: metrics_result.value.cohens_kappa?.result,
        p0: metrics_result.value.cohens_kappa?.po,
        pe: metrics_result.value.cohens_kappa?.pe,
        tolerance: tolerance,
      });
    }
  }

  const worksheetMetrics = XLSX.utils.json_to_sheet(rowsMetrics);
  const worksheetAnnotations = XLSX.utils.json_to_sheet(rowsAnnotations);
  return [worksheetMetrics, worksheetAnnotations];
};

const getZippeableBlob = async (workBook: XLSX.WorkBook) => {
  const b64Data = XLSX.writeXLSX(workBook, {
    bookType: "xlsx",
    type: "base64",
    compression: true,
  });

  const contentType = "application/octet-stream";

  const dataUrl = `data:${contentType};base64,${b64Data}`;
  const blob = await (await fetch(dataUrl)).blob();
  return blob;
};

const download_blob = async (blob: Blob) => {
  const element = window.document.createElement("a");
  element.setAttribute("href", URL.createObjectURL(blob));
  element.setAttribute("download", `${task.value?.name}.zip`);
  element.style.display = "none";
  window.document.body.appendChild(element);
  element.click();
  window.document.body.removeChild(element);
};

const downloadAll = async () => {
  loading_download.value = true;
  const zip = new JSZip();
  try {
    for (let i = 0; i < documentsOptions.length; i++) {
      const document = documentsOptions[i];
      const workbookMetrics = XLSX.utils.book_new();
      const workbookAnnotations = XLSX.utils.book_new();
      for (let j = 0; j < labelsOptions.length; j++) {
        const label = labelsOptions[j];
        const sheets: XLSX.WorkSheet[] = await getXlslTab(
          task.value?.id?.toString()!,
          label,
          [document.value],
          annotatorsOptions,
          tolerance.value!
        );
        XLSX.utils.book_append_sheet(workbookMetrics, sheets[0], label);
        XLSX.utils.book_append_sheet(workbookAnnotations, sheets[1], label);
      }
      const filename = document.label.substring(0, document.label.length - 4);
      zip.file(`${filename}_metrics.xlsx`, getZippeableBlob(workbookMetrics));
      zip.file(`${filename}_annotations.xlsx`, getZippeableBlob(workbookAnnotations));
    }

    const workbookMetrics = XLSX.utils.book_new();
    const workbookAnnotations = XLSX.utils.book_new();
    for (let i = 0; i < labelsOptions.length; i++) {
      const label = labelsOptions[i];
      const sheets = await getXlslTab(
        task.value?.id?.toString()!,
        label,
        documentsOptions.map((d) => d.value),
        annotatorsOptions,
        tolerance.value!
      );
      XLSX.utils.book_append_sheet(workbookMetrics, sheets[0], label);
      XLSX.utils.book_append_sheet(workbookAnnotations, sheets[1], label);
    }
    zip.file(`_metrics.xlsx`, getZippeableBlob(workbookMetrics));
    zip.file(`_annotations.xlsx`, getZippeableBlob(workbookAnnotations));

    const blob = await zip.generateAsync({ type: "blob" });

    download_blob(blob);

    $toast.success(`One .zip file has been downloaded!`);
  } catch (error) {
    console.log(error);
    loading_download.value = false;
  }

  loading_download.value = false;
};

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
    doc_name: current.doc_name,
    doc_text: current.doc_text,
  });
  loading_annotations.value = false;
};

const separateIntoWords = (annotations: RichAnnotation[]) => {
  metrics_result.value = {} as any;
  let limit = 10 ** 6;
  loading_annotations.value = true;
  var new_annotations: RichAnnotation[] = [];

  annotations.forEach((ann) => {
    const words = ann.text.matchAll(/\S+/g);
    while (limit > 0) {
      const w = words.next();
      if (w.done) break;
      new_annotations.push({
        start: ann.start + w.value.index!,
        end: ann.start + w.value.index! + w.value[0].length,
        text: w.value[0],
        label: ann.label,
        annotator: ann.annotator,
        hidden: false,
        ann_id: ann.ann_id,
        doc_id: ann.doc_id,
        doc_name: ann.doc_name,
        doc_text: ann.doc_text,
      });
      limit--;
    }
  });
  loading_annotations.value = false;
  return new_annotations;
};

const modeToggle = (value: boolean) => {
  separate_into_words.value = value;
  if (!task.value) {
    $toast.error(`Invalid Task`);
    return;
  }
  if (!selectedLabel.value) {
    return;
  }
  getAnnotations(
    task.value?.id.toString()!,
    selectedLabel.value!,
    selectedDocuments.value!,
    selectedAnnotators.value!
  );
};

const emitMergeUp = (ann_index: number): void => {
  loading_annotations.value = true;
  const current = _.clone(annotations[ann_index]);
  const previous = _.clone(annotations[ann_index - 1]);

  annotations[ann_index - 1].end = current.end;
  annotations[ann_index - 1].text = current.doc_text.substring(
    previous.start,
    current.end
  )!;

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
  loading_annotations.value = false;
};

const emitMergeDown = (ann_index: number): void => {
  loading_annotations.value = true;
  const current = _.clone(annotations[ann_index]);
  const next = _.clone(annotations[ann_index + 1]);

  annotations[ann_index + 1].start = current.start;
  annotations[ann_index + 1].text = current.doc_text.substring(current.start, next.end);

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
  loading_annotations.value = false;
};

const emitSetHidden = (ann_index: number, hidden: Boolean): void => {
  annotations[ann_index].hidden = hidden;
};

onMounted(async () => {
  initFlowbite();

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
        return { value: d.id.toString(), label: d.id.toString() + " - " + d.name };
      }
    )
  );

  annotatorsOptions.push(
    ...(await userApi.findUsersByTask(task.value.id.toString())).map((a) => a.email)
  );
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
  overflow: auto;
}
</style>
