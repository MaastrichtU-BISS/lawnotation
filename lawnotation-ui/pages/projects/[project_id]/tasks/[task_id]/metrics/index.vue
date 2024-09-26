<template>
  <div>
    <Breadcrumb v-if="task && project" :crumbs="[
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
    <div class="dimmer-wrapper pt-2">
      <DimmerProgress v-if="download_progress.loading" v-model="download_progress" />
      <Dimmer v-else v-model="loading" />
      <div class="dimmer-content">
        <aside id="logo-sidebar"
          class="fixed left-0 z-40 w-80 side-panel-h transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700"
          aria-label="Sidebar" style="margin-top: inherit">
          <div class="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
            <ul class="space-y-2 text-sm">
              <li>
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Label</label>
                <Dropdown v-model="selectedLabel" :options="labelsOptions" optionLabel="name"
                  placeholder="Select a Label" class="w-full" @change="selectLabel($event.value?.name)"
                  :panel-style="{ width: '295px'}" :pt="{
                    item: '!py-2'
                  }" :ptOptions="{ mergeProps: true }">
                  <template #value="slotProps">
                    <div v-if="slotProps.value">
                      <LabelCmpt :label="{color: labelsOptions.find((l) => l.name == slotProps.value)?.color!, name: slotProps.value}"></LabelCmpt>
                    </div>
                    <span v-else>
                      {{ slotProps.placeholder }}
                    </span>
                  </template>
                  <template #option="slotProps">
                    <LabelCmpt :label="slotProps.option"></LabelCmpt>
                  </template>
                </Dropdown>
              </li>
              <li>
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Document(s)</label>
                <Multiselect v-model="selectedDocumentsOrEmpty" :mode="'tags'" :close-on-select="false"
                  :options="documentsOptions" :searchable="true" placeholder="All" @change="selectDocument" />
              </li>
              <li>
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Annotators</label>
                <Multiselect v-model="selectedAnnotatorsOrEmpty" :options="annotatorsOptions" :mode="'tags'"
                  :searchable="true" :close-on-select="false" placeholder="All" @change="selectAnnotators" />
              </li>
              <li>
                <div>
                  <div class="flex justify-between">
                    <label for="small-input"
                      class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tolerance</label>
                    <InfoToolTip :id="'tooltip_tolerance'"
                      :text="'A tolerance of 1 allows for small differences of one character while still considering them as agreements. Higher tolerance offers more flexibility in matching.'" />
                  </div>
                  <input type="number" id="small-input" v-model="tolerance" min="0" :max="10" step="1"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
                </div>
              </li>
              <li>
                <div class="flex justify-between my-4">
                  <span>&nbsp;</span>
                  <label class="relative grid grid-cols-[1fr_min-content_1fr] items-center cursor-pointer">
                    <span class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">Annotation</span>
                    <input type="checkbox" value="" class="sr-only peer" @input="($event: Event) => {
                      modeToggle($event.target.checked);
                    }
                      " />
                    <div
                      class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                    </div>
                    <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300 justify-self-start">Word</span>
                  </label>
                  <InfoToolTip :id="'tooltip_annotation_word'"
                    :text="'Choose between comparing entire chunks with annotations or individual words\' annotations.'" />
                </div>
              </li>
              <li>
                <div class="flex justify-between my-4">
                  <span>&nbsp;</span>
                  <label class="relative grid grid-cols-[1fr_min-content_1fr] items-center cursor-pointer">
                    <span class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">Equal</span>
                    <input type="checkbox" value="" class="sr-only peer" @input="($event: Event) => {
                      contained = !contained;
                      tolerance = 0;
                    }
                      " />

                    <div
                      class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                    </div>
                    <span
                      class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300 justify-self-start">Overlap</span>
                  </label>
                  <InfoToolTip :id="'tooltip_equal_overlap'"
                    :text="`With \'Equal Overlap\', annotations must match exactly. With \'Overlapping Annotations\', any degree of overlap counts as agreement.`" />
                </div>
              </li>
              <li>
                <div class="flex justify-between my-4">
                  <span>&nbsp;</span>
                  <label class="h-full relative grid grid-cols-[1fr_min-content_1fr] items-center cursor-pointer">
                    <span class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">Include NTA</span>
                    <input type="checkbox" value="" :checked="hideNonText" class="sr-only peer" @input="($event: Event) => {
                      toggleTextToHidden($event?.target?.checked);
                    }
                      " />

                    <div
                      class="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                    </div>
                    <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300 justify-self-start">Exclude
                      NTA</span>
                  </label>

                  <InfoToolTip :id="'tooltip_nta'"
                    :text="'Decide whether to factor in non-text annotations (NTA) (e.g., \'. 2.\') that do not consist of regular text. When \'Include\' is chosen, these annotations contribute to agreement calculations. When \'Ignore\' is chosen, they are excluded from calculations.'" />
                </div>
              </li>
              <li>
                <Button class="w-full" label="Compute Metrics" size="small" @click="clickComputeMetrics" />
              </li>
              <li>
                <Button class="w-full" label="Download All" outlined size="small" @click="clickDownloadAll" />
              </li>
            </ul>
          </div>
        </aside>
        <AnnotationsList v-model:annotations="annotations" v-model:loading_annotations="loading_annotations"
          :labels="labelsOptions" :loading="loading" :documentsData="documentsData"></AnnotationsList>
      </div>
    </div>
    <ResultsModal v-if="metricsResult?.confidence" v-model:visible="metricsModalVisible" :metricResults="metricsResult"
      :loading="loading"></ResultsModal>
  </div>
</template>
<script setup lang="ts">
import LabelCmpt from "~/components/labels/Label.vue";
import Dropdown from "primevue/dropdown";
import AnnotationsList from "~/components/metrics/AnnotationsList.vue";
import ResultsModal from "~/components/metrics/ResultsModal.vue";
import * as XLSX from "xlsx";
import Multiselect from "@vueform/multiselect";
import type { Task, Project } from "~/types";
import type { RichAnnotation } from "~/utils/metrics";
import type {
  MetricResult,
  MetricResultsTable,
  ConfidenceMetricResult,
} from "~/utils/metrics";
import { initFlowbite } from "flowbite";
import DimmerProgress from "~/components/DimmerProgress.vue";
import Dimmer from "~/components/Dimmer.vue";
import { saveAs } from "file-saver";
import JSZip, { file } from "jszip";
import type { RangeLabel } from "~/utils/metrics";
import { authorizeClient } from "~/utils/authorize.client";

const { $toast, $trpc } = useNuxtApp();

const route = useRoute();
const task = ref<Task>();
const project = ref<Project>();

const download_progress = ref<{ current: number; total: number; loading: boolean; message: string }>({
  current: 0,
  total: 0,
  loading: false,
  message: ""
});

// options
const loading_options = ref(false);

const labelsOptions = reactive<{ name: string, color: string }[]>([]);
const selectedLabel = ref<string>();

const documentsOptions = reactive<{ value: string; label: string }[]>([]);
const selectedDocumentsOrEmpty = ref<string[]>([]);

const annotatorsOptions = reactive<string[]>([]);
const selectedAnnotatorsOrEmpty = ref<string[]>([]);

const tolerance = ref<number>(0);

const separate_into_words = ref(false);
const contained = ref(false);
const hideNonText = ref(true);

// annotations
const annotations_limit = 10 ** 3;
const loading_annotations = ref(false);
const annotations = reactive<RichAnnotation[]>([]);

// metrics
const metricsModalVisible = ref<boolean>(false);
const metricsResult = ref<MetricResultsTable>();

const documentsData = ref<any>({});

const loading = computed((): boolean => {
  return (loading_annotations.value ||
    download_progress.value.loading ||
    metricsResult.value?.loading ||
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
  try {
    annotations.splice(0);
    const anns = await getAnnotations(
      task.value?.id.toString()!,
      selectedLabel.value!,
      selectedDocumentsOrEmpty.value!,
      selectedAnnotatorsOrEmpty.value!,
      separate_into_words.value,
      hideNonText.value
    );

    if (anns.length < annotations_limit) annotations.push(...anns);
    loading_annotations.value = false;
  } catch (error) {
    loading_annotations.value = false;
  }
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

  return $fetch("/api/metrics/get_metrics", {
    method: "POST",
    body: body,
  });
};

const updateMetrics = (metrics: MetricResult[]) => {
  metrics.map((m) => {
    (metricsResult.value as any)[m.name] = m;
  });
};

const clickComputeMetrics = async () => {
  if (!selectedLabel.value || !metricsResult.value) return;
  metricsModalVisible.value = true;
  try {
    // agreement metrics
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

    // confidence metrics
    const metric = await computeConfidenceMetrics(
      task.value?.id.toString()!,
      selectedAnnotators.value.length,
      selectedAnnotatorsOrEmpty.value,
      selectedDocumentsOrEmpty.value
    );

    metricsResult.value.confidence = metric;
    metricsResult.value.loading = false;
  } catch (error) {
    metricsResult.value.loading = false;
  }
};

const computeConfidenceMetrics = async (
  task_id: string,
  annotators_length: number,
  annotators: string[],
  documents: string[]
): Promise<ConfidenceMetricResult> => {
  const body = JSON.stringify({
    annotators_length: annotators_length,
    task_id: task_id,
    annotators: annotators,
    documents: documents,
  });

  return $fetch(`/api/metrics/confidence`, {
    method: "POST",
    body: body,
  });
};

const clickDownloadAll = async () => {
  download_progress.value.loading = true;
  try {
    const blobs = await download_all({
      task_id: task.value?.id.toString()!,
      labelsOptions: labelsOptions.map((l) => l.name),
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
    (selectedDocuments.value.length + 1) * labelsOptions.length * 3 +
    (selectedDocuments.value.length + 1);
  try {
    if (data.documents.length > 1) {
      const { workBookConfidence, workbookMetrics, workbookAnnotations, workbookDescriptive } = await createWorkBooks(data);
      results.push({
        wb: getZippeableBlob(workBookConfidence),
        name: `_confidence.xlsx`,
      });
      results.push({
        wb: getZippeableBlob(workbookMetrics),
        name: `_metrics.xlsx`,
      });
      results.push({
        wb: getZippeableBlob(workbookAnnotations),
        name: `_annotations.xlsx`,
      });
      results.push({
        wb: getZippeableBlob(workbookDescriptive),
        name: `_descriptive.xlsx`,
      });
    }

    // Per document
    for (let i = 0; i < data.documents.length; i++) {
      const document = data.documents[i];
      const filename = document + "-" + data.documentsData[document].name.split(".")[0];

      const { workBookConfidence, workbookMetrics, workbookAnnotations, workbookDescriptive } = await createWorkBooks(data, document);

      results.push({
        wb: getZippeableBlob(workBookConfidence),
        name: `${filename}_confidence.xlsx`,
      });

      results.push({
        wb: getZippeableBlob(workbookMetrics),
        name: `${filename}_metrics.xlsx`,
      });

      results.push({
        wb: getZippeableBlob(workbookAnnotations),
        name: `${filename}_annotations.xlsx`,
      });

      results.push({
        wb: getZippeableBlob(workbookDescriptive),
        name: `${filename}_descriptive.xlsx`,
      });
    }

    return results;
  } catch (error) { console.error(error) }
  return [];
}

async function createWorkBooks(data: any, document?: any) {
  // All confidence
  const workBookConfidence = await getConfidenceSheet(
    data.task_id,
    data.annotators.length,
    data.annotatorOrEmpty,
    document ? [document] : data.documentsOrEmpty
  );
  download_progress.value.current++;

  // All metrics
  const workbookMetrics = XLSX.utils.book_new();
  const workbookAnnotations = XLSX.utils.book_new();
  const workbookDescriptive = XLSX.utils.book_new();
  for (let i = 0; i < data.labelsOptions.length; i++) {
    const label = data.labelsOptions[i].name;

    const annotations = await getAnnotations(
      data.task_id,
      label,
      data.documents,
      data.annotators,
      data.byWords,
      data.hideNonText,
    );

    const metrics = await compute_metrics(
      data.task_id,
      label,
      document ? [document] : data.documentsOrEmpty,
      data.annotators,
      data.annotatorsOrEmpty,
      data.tolerance,
      data.byWords,
      data.hideNonText,
      data.contained,
      data.documentsData,
      data.documentsOptions,
      annotations
    );

    const metrics_sheet = await getMetricsSheet(
      metrics,
      label,
      data.documentsOrEmpty,
      data
    );
    const metrics_sample = metrics[0].table ?? metrics[2].table!;
    const annotations_sheet = await getAnnotationsSheet(metrics_sample?.length ?
      metrics_sample :
      annotations.map(annotation => {
        return {
          start: annotation.start,
          end: annotation.end,
          label: annotation.label,
          text: annotation.text,
          annotators: { [annotation.annotator]: Number(annotation.label !== "NOT ANNOTATED") },
          doc_id: annotation.doc_id.toString(),
          doc_name: annotation?.doc_name!,
          zeros: 0,
          ones: 0,
          confidences: {
            [annotation.annotator]: annotation.confidence
          }
        }
      }));
    const descriptive_anns_sheet = await getDescriptiveAnnotatorSheet(
      metrics_sample,
      data.annotators
    );

    XLSX.utils.book_append_sheet(workbookMetrics, metrics_sheet, label.substring(0, 31));
    XLSX.utils.book_append_sheet(workbookAnnotations, annotations_sheet, label.substring(0, 31));
    XLSX.utils.book_append_sheet(workbookDescriptive, descriptive_anns_sheet, label.substring(0, 31));

    download_progress.value.current += 3;
  }

  return { workBookConfidence, workbookMetrics, workbookAnnotations, workbookDescriptive };
}

async function getMetricsSheet(
  metrics: MetricResult[],
  label: string,
  documents: string[],
  data: any
) {
  let rows: any[] = [];

  metrics.map((m) => {
    if (m.result !== undefined)
      rows.push({
        metric: m.name,
        annotators: data.annotators.join(","),
        value: m.result,
        p0: m.po,
        pe: m.pe,
        tolerance: data.tolerance,
        consider_contained: data.contained ? "yes" : "no",
      });
  });

  if (data.annotators.length > 2) {
    for (let i = 0; i < data.annotators.length; i++) {
      for (let j = i + 1; j < data.annotators.length; j++) {
        const metrics = await compute_metrics(
          data.task_id,
          label,
          documents,
          [data.annotators[i], data.annotators[j]],
          [data.annotators[i], data.annotators[j]],
          data.tolerance,
          data.byWords,
          data.hideNonText,
          data.contained,
          data.documentsData,
          data.documentsOptions
        );

        metrics.map((m) => {
          if (m.result !== undefined)
            rows.push({
              metric: m.name,
              annotators: data.annotators[i] + "," + data.annotators[j],
              value: m.result,
              p0: m.po,
              pe: m.pe,
              tolerance: data.tolerance,
              consider_contained: data.contained ? "yes" : "no",
            });
        });
      }
    }
  }

  return XLSX.utils.json_to_sheet(rows);
}

async function getAnnotationsSheet(table: RangeLabel[]) {
  let rows: any[] = [];
  if (table) {
    table.map((r: RangeLabel) => {
      Object.entries(r.annotators).forEach(([k, v]) => {
        rows.push({
          document: r.doc_id + "-" + r.doc_name,
          annotator: k,
          start: r.start,
          end: r.end,
          text: r.text.length <= 1000 ? r.text : `${r.text.substring(0, 100)} ... ${r.text.substring(900, 1000)}`,
          confidence: r.confidences[k],
          value: v,
        });
      });
    });
  }

  return XLSX.utils.json_to_sheet(rows);
}

async function getDescriptiveAnnotatorSheet(table: RangeLabel[], annotators: string[]) {
  let rows: any[] = [];
  let dic: any = {};
  let nanns: number = 0;
  annotators.map((a) => {
    dic[a] = { amount: 0, na_amount: 0 };
  });
  if (table) {
    table.map((r: RangeLabel) => {
      Object.entries(r.annotators).forEach(([k, v]) => {
        if (v) {
          dic[k]["amount"]++;
        }
      });
      if (r.label == "NOT ANNOTATED") {
        nanns++;
      }
    });
    Object.entries(dic).forEach(([k, v]) => {
      rows.push({
        annotator: k,
        annotations: dic[k]["amount"],
        non_annotations: nanns,
      });
    });
  }

  return XLSX.utils.json_to_sheet(rows);
}

async function getConfidenceSheet(
  task_id: string,
  annotators_length: number,
  annotators: string[],
  documents: string[]
) {
  const workbookDifficulty = XLSX.utils.book_new();
  const diff_metric_body = JSON.stringify({
    task_id: task_id,
    annotators_length: annotators_length,
    annotators: annotators,
    documents: documents,
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

  const worksheetDifficultyAnnotator = XLSX.utils.json_to_sheet(
    dm.table.map((r) => {
      return {
        annotator: r.annotator,
        doc_id: r.doc_id,
        assignment_id: r.ass_id,
        stars: r.rating,
      };
    })
  );

  XLSX.utils.book_append_sheet(
    workbookDifficulty,
    worksheetDifficulty,
    "Confidence Metrics"
  );

  XLSX.utils.book_append_sheet(
    workbookDifficulty,
    worksheetDifficultyAnnotator,
    "Annotators "
  );
  return workbookDifficulty;
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

const toggleTextToHidden = (value: boolean): RichAnnotation[] => {
  hideNonText.value = value;
  return setTextToHidden(annotations, value);
};

onMounted(async () => {
  initFlowbite();

  loading_options.value = true;

  task.value = await $trpc.task.findById.query(+route.params.task_id);

  project.value = await $trpc.project.findById.query(+route.params.project_id);

  labelsOptions.push(
    ...(await $trpc.labelset.findById.query(+task.value.labelset_id)).labels
  );

  documentsOptions.push(
    ...(await $trpc.document.findSharedDocumentsByTask.query(+task.value.id)).map((d) => {
      if (!(d.id in documentsData.value)) {
        documentsData.value[d.id] = { full_text: d.full_text, name: d.name };
      }
      return { value: d.id.toString(), label: d.id.toString() + " - " + d.name };
    })
  );

  annotatorsOptions.push(
    ...(await $trpc.user.findUsersByTask.query(+task.value.id)).map((a) => a.email!)
  );

  loading_options.value = false;
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
