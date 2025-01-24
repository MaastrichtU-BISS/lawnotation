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
      <DimmerProgress v-if="download_progress.loading" v-model="download_progress" />
      <Dimmer v-else v-model="loading" />
      <div class="dimmer-content">
        <!-- left column -->
        <aside
          class="fixed left-0 z-40 w-80 side-panel-h transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700"
          aria-label="Sidebar" style="margin-top: inherit">
          <div class="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
            <TabView v-model:activeIndex="metricsTypeActiveTab" v-on:update:active-index="updateUrl($event)">
              <TabPanel header="Descriptive" :pt="{
                headerAction: '!py-3',
              }" :ptOptions="{ mergeProps: true }">
                <ParametersColumn :metric-type="MetricTypes.DESCRIPTIVE" :labels-options="labelsOptions"
                  :annotators-options="annotatorsOptions" :documents-options="allDocumentsOptions"
                  :showNonDocumentLevelAgreementParams="false" v-model:selectedLabelsOrEmpty="selectedLabelsOrEmpty"
                  v-model:selectedDocumentsOrEmpty="allSelectedDocumentsOrEmpty"
                  v-model:selectedAnnotatorsOrEmpty="selectedAnnotatorsOrEmpty" @click-download-all="clickDownloadAll"
                  @update-annotations="updateAnnotations">
                </ParametersColumn>
              </TabPanel>
              <TabPanel header="Agreement" :disabled="annotatorsOptions.length < 2" :pt="{
                headerAction: '!py-3',
              }" :ptOptions="{ mergeProps: true }">
                <ParametersColumn :metric-type="MetricTypes.AGREEMENT" :labels-options="labelsOptions"
                  :annotators-options="annotatorsOptions" :documents-options="sharedDocumentsOptions"
                  :showNonDocumentLevelAgreementParams="task && !isDocumentLevel(task)"
                  v-model:selectedLabelsOrEmpty="selectedLabelsOrEmpty"
                  v-model:selectedDocumentsOrEmpty="sharedSelectedDocumentsOrEmpty"
                  v-model:selectedAnnotatorsOrEmpty="selectedAnnotatorsOrEmpty" v-model:tolerance="tolerance"
                  v-model:contained="contained" v-model:separate_into_words="separate_into_words"
                  v-model:hideNonText="hideNonText" @click-compute-metrics="clickComputeMetrics"
                  @click-download-all="clickDownloadAll" @update-annotations="updateAnnotations"  @click-download-all-intra="clickDownloadAllIntra($event)">
                </ParametersColumn>
              </TabPanel>
            </TabView>
          </div>
        </aside>
        <AnnotationsList v-model:annotations="annotations" v-model:loading_annotations="loading_annotations"
          :labels="labelsOptions" :loading="loading" :documentsData="documentsData" :metricType="metricType"
          :documentUrl="`/projects/${project.id}/tasks/${task.id}/documents`"></AnnotationsList>
      </div>
    </div>
    <ResultsModal v-if="metricsResult?.confidence" v-model:visible="metricsModalVisible" :metricResults="metricsResult"
      :loading="loading"></ResultsModal>
  </div>
</template>
<script setup lang="ts">
import AnnotationsList from "~/components/metrics/AnnotationsList.vue";
import ResultsModal from "~/components/metrics/ResultsModal.vue";
import ParametersColumn from "~/components/metrics/ParametersColumn.vue";
import * as XLSX from "xlsx";
import type { Task, Project } from "~/types";
import type { RichAnnotation } from "~/utils/metrics";
import type {
  MetricResult,
  MetricResultsTable,
  ConfidenceMetricResult,
} from "~/utils/metrics";
import { MetricTypes } from "~/utils/enums";
import { isDocumentLevel } from "~/utils/levels";
import DimmerProgress from "~/components/DimmerProgress.vue";
import Dimmer from "~/components/Dimmer.vue";
import fileSaver from "file-saver";
import JSZip, { file } from "jszip";
import type { RangeLabel } from "~/utils/metrics";
import { authorizeClient } from "~/utils/authorize.client";
// import { mkConfig, generateCsv, asBlob } from "export-to-csv";

const saveAs = fileSaver.saveAs;

const { $toast, $trpc } = useNuxtApp();

const router = useRouter();
const route = useRoute();
const task = ref<Task>();
const project = ref<Project>();

const download_progress = ref<{ current: number; total: number; loading: boolean; message: string }>({
  current: 0,
  total: 0,
  loading: false,
  message: ""
});

// metrics
const metricsTypeActiveTab = ref<number>(0);
const metricsModalVisible = ref<boolean>(false);
const metricsResult = ref<MetricResultsTable>({} as any);
const metricType = computed(() => {
  return metricsTypeActiveTab.value == 1 ? MetricTypes.AGREEMENT : MetricTypes.DESCRIPTIVE;
});
const updateUrl = (activeIndex: number) => {
  if (activeIndex == 1) {
    router.push({ hash: '#agreement' });
  } else {
    router.push({ hash: '#descriptive' });
  }
  selectedLabelsOrEmpty.value.splice(0);
  selectedDocumentsOrEmpty.value.splice(0);
  selectedAnnotatorsOrEmpty.value.splice(0);
  annotations.splice(0);
  updateAnnotations();
};

// options
const loading_options = ref(false);

const labelsOptions = reactive<{ name: string, color: string }[]>([]);
const selectedLabelsOrEmpty = ref<string[]>([]);
const selectedLabels = computed((): string[] => {
  return selectedLabelsOrEmpty.value && selectedLabelsOrEmpty.value.length
    ? selectedLabelsOrEmpty.value
    : labelsOptions.map((l => l.name));
});

const allDocumentsOptions = reactive<{ value: string; label: string }[]>([]);
const sharedDocumentsOptions = reactive<{ value: string; label: string }[]>([]);
const documentsOptions = computed(() => {
  return metricsTypeActiveTab.value == 0 ? allDocumentsOptions : sharedDocumentsOptions;
});
const allSelectedDocumentsOrEmpty = ref<string[]>([]);
const sharedSelectedDocumentsOrEmpty = ref<string[]>([]);
const selectedDocumentsOrEmpty = computed(() => {
  return metricType.value == MetricTypes.AGREEMENT ? sharedSelectedDocumentsOrEmpty.value : allSelectedDocumentsOrEmpty.value;
});
const selectedDocuments = computed((): string[] => {
  return selectedDocumentsOrEmpty.value && selectedDocumentsOrEmpty.value.length
    ? selectedDocumentsOrEmpty.value
    : documentsOptions.value.map(d => d.value);
});
const selectedDocumentsOptQuery = computed((): string[] => {
  if (metricType.value == MetricTypes.AGREEMENT &&
    !sharedSelectedDocumentsOrEmpty.value?.length &&
    sharedDocumentsOptions.length < allDocumentsOptions.length) {
    return sharedDocumentsOptions.map(d => d.value);
  }
  return selectedDocumentsOrEmpty.value;
});

const annotatorsOptions = reactive<string[]>([]);
const selectedAnnotatorsOrEmpty = ref<string[]>([]);
const selectedAnnotators = computed((): string[] => {
  return selectedAnnotatorsOrEmpty.value && selectedAnnotatorsOrEmpty.value.length
    ? selectedAnnotatorsOrEmpty.value
    : annotatorsOptions;
});

const tolerance = ref<number>(0);
const separate_into_words = ref(false);
const contained = ref(false);
const hideNonText = ref(true);

// annotations
const annotations_limit = 10 ** 6;
const loading_annotations = ref(false);
const annotations = reactive<RichAnnotation[]>([]);
const documentsData = ref<any>({});
const documentsNames = ref<any>({});

const loading = computed((): boolean => {
  return (loading_annotations.value ||
    download_progress.value.loading ||
    metricsResult.value?.loading ||
    loading_options.value) as boolean;
});

const getAnnotations = async (
  task_id: string,
  labels: string[],
  documents: string[],
  annotators: string[],
  byWords: boolean,
  hideNonText: boolean,
  documentLevel: boolean = false,
  metricType: MetricTypes = MetricTypes.AGREEMENT
) => {
  const body = JSON.stringify({
    task_id: task_id,
    labels: labels,
    documents: documents,
    annotators: annotators,
    byWords: byWords,
    hideNonText: hideNonText,
    documentLevel: documentLevel,
    metricType: metricType
  });

  return $fetch("/api/metrics/get_annotations", {
    method: "POST",
    body: body,
  });
};

const updateAnnotations = async () => {
  if (!task.value) {
    $toast.error("Task does not exist");
    throw new Error("Task does not exist");
  }

  // only allow multiple labels when descriptive
  if (metricType.value == MetricTypes.DESCRIPTIVE || selectedLabelsOrEmpty.value.length == 1) {
    loading_annotations.value = true;
    try {
      annotations.splice(0);
      const anns = await getAnnotations(
        task.value?.id.toString()!,
        selectedLabelsOrEmpty.value!,
        selectedDocumentsOptQuery.value!,
        selectedAnnotatorsOrEmpty.value!,
        separate_into_words.value,
        hideNonText.value,
        isDocumentLevel(task.value),
        metricType.value
      );
      if (anns.length < annotations_limit) annotations.push(...anns);
      loading_annotations.value = false;
    } catch (error) {
      loading_annotations.value = false;
    }
  }
};

const updateMetrics = (metrics: MetricResult[], confidenceMetric: ConfidenceMetricResult) => {

  metricsResult.value = {} as any;
  metrics.map((m) => {
    (metricsResult.value as any)[m.name] = m;
  });
  metricsResult.value.confidence = confidenceMetric;
  metricsResult.value.loading = false;
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
  documentLevel: boolean,
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
    documentLevel: documentLevel,
    documentsData: documentsData,
    documentsOptions: documentsOptions,
    annotations: annotations,
  });

  return $fetch("/api/metrics/get_metrics", {
    method: "POST",
    body: body,
  });
};

const clickComputeMetrics = async () => {
  if (!selectedLabels.value) return;
  if (!task.value) {
    $toast.error("Task does not exist");
    throw new Error("Task does not exist");
  }
  metricsModalVisible.value = true;
  try {
    // agreement metrics
    const metrics = await compute_metrics(
      task.value?.id.toString()!,
      selectedLabels.value[0],
      selectedDocumentsOptQuery.value,
      selectedAnnotators.value,
      selectedAnnotatorsOrEmpty.value,
      tolerance.value,
      separate_into_words.value,
      hideNonText.value,
      contained.value,
      isDocumentLevel(task.value),
      documentsData.value,
      documentsOptions.value.map((d) => d.value),
      annotations && annotations.length ? annotations : []
    );

    // confidence metrics
    const confidenceMetric = await computeConfidenceMetrics(
      task.value?.id.toString()!,
      selectedAnnotators.value.length,
      selectedAnnotatorsOrEmpty.value,
      selectedDocumentsOptQuery.value
    );

    updateMetrics(metrics, confidenceMetric);

  } catch (error) {
    metricsResult.value!.loading = false;
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
  if (!task.value) {
    $toast.error("Task does not exist");
    throw new Error("Task does not exist");
  }

  download_progress.value.loading = true;
  try {
    const blobs = await download_all({
      task_id: task.value?.id.toString()!,
      labelsOptions: labelsOptions.map((l) => l.name),
      documents: selectedDocuments.value,
      documentsOrEmpty: selectedDocumentsOptQuery.value,
      annotators: selectedAnnotators.value,
      annotatorsOrEmpty: selectedAnnotatorsOrEmpty.value,
      tolerance: tolerance.value,
      byWords: separate_into_words.value,
      hideNonText: hideNonText.value,
      contained: contained.value,
      documentLevel: isDocumentLevel(task.value),
      documentsData: documentsData.value,
      documentsOptions: documentsOptions.value.map((d) => d.value),
    });

    const zip = JSZip();
    for (let i = 0; i < blobs.length; i++) {
      const b = await (await fetch(blobs[i].data)).blob();
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

const clickDownloadAllIntra = async (similarTaskId: number) => {
  if (!task.value) {
    $toast.error("Task does not exist");
    throw new Error("Task does not exist");
  }

  download_progress.value.loading = true;
  download_progress.value.message = "Merging tasks..."
  try {
    const mergedTask = await $trpc.task.mergeTasks.mutate({ originalTaskId: task.value.id, similarTaskId: similarTaskId});
    console.log(mergedTask);
    download_progress.value.loading = false;
    $toast.success(`One .zip file has been downloaded!`);
  } catch (error) {
    download_progress.value.loading = false;
  }
};

async function download_all(data: any) {
  if (metricType.value == MetricTypes.AGREEMENT) {
    return download_all_xlsl(data);
  }
  return download_all_csv(data);
}

//#region CSV

async function download_all_csv(data: any) {
  let results: { data: string; name: string }[] = [];
  download_progress.value.current = 0;
  download_progress.value.total =
    (selectedDocuments.value.length + 1) * labelsOptions.length;
  try {
    if (data.documents.length > 1) {
      const { workbookAnnotations } = await createBlobs(data);
      results.push({
        data: getZippeableBlob(workbookAnnotations),
        name: `_annotations.xlsx`,
      });
    }

    // Per document
    for (let i = 0; i < data.documents.length; i++) {
      const document = data.documents[i];
      const filename = `${document}-${documentsNames.value[document].split('.')[0]}`;
      const { workbookAnnotations } = await createBlobs(data, document);
      results.push({
        data: getZippeableBlob(workbookAnnotations),
        name: `${filename}_annotations.xlsx`,
      });
    }

    return results;
  } catch (error) { console.error(error) }
  return [];
}

async function createBlobs(data: any, document?: any) {
  const workbookAnnotations = XLSX.utils.book_new();
  for (let i = 0; i < data.labelsOptions.length; i++) {
    const label = data.labelsOptions[i];

    const annotations = await getAnnotations(
      data.task_id,
      [label],
      document ? [document] : data.documentsOrEmpty,
      data.annotators,
      data.byWords,
      data.hideNonText,
      data.documentLevel,
      MetricTypes.DESCRIPTIVE
    );

    const annotations_sheet = XLSX.utils.json_to_sheet(annotations.filter(a => a.label !== "NOT ANNOTATED").map(annotation => {
      return {
        start: annotation.start,
        end: annotation.end,
        label: annotation.label,
        text: annotation.text,
        annotator: annotation.annotator,
        doc_id: annotation.doc_id.toString(),
        doc_name: annotation?.doc_name!,
        confidence: annotation.confidence
      }
    }));

    let sheetName = label.substring(0, 31);

    // works as long as there are less than 100 labels
    if (label.length > 31) {
      const range = i + 1 > 9 ? 12 : 13;
      sheetName = `${i + 1}-${label.substring(0, 13)}...${label.substring(label.length - range)}`;
    }

    XLSX.utils.book_append_sheet(workbookAnnotations, annotations_sheet, sheetName);

    download_progress.value.current += 1;
  }

  return { workbookAnnotations };
}

//#endregion

//#region EXCEL
async function download_all_xlsl(data: any) {
  let results: { data: string; name: string }[] = [];
  download_progress.value.current = 0;
  download_progress.value.total =
    (selectedDocuments.value.length + 1) * labelsOptions.length * 3 +
    (selectedDocuments.value.length + 1);
  try {
    if (data.documents.length > 1) {
      const { workBookConfidence, workbookMetrics, workbookAnnotations, workbookDescriptive } = await createWorkBooks(data);
      results.push({
        data: getZippeableBlob(workBookConfidence),
        name: `_confidence.xlsx`,
      });
      results.push({
        data: getZippeableBlob(workbookMetrics),
        name: `_metrics.xlsx`,
      });
      results.push({
        data: getZippeableBlob(workbookAnnotations),
        name: `_annotations.xlsx`,
      });
      results.push({
        data: getZippeableBlob(workbookDescriptive),
        name: `_descriptive.xlsx`,
      });
    }

    // Per document
    for (let i = 0; i < data.documents.length; i++) {
      const document = data.documents[i];
      const filename = document + "-" + data.documentsData[document].name.split(".")[0];

      const { workBookConfidence, workbookMetrics, workbookAnnotations, workbookDescriptive } = await createWorkBooks(data, document);

      results.push({
        data: getZippeableBlob(workBookConfidence),
        name: `${filename}_confidence.xlsx`,
      });

      results.push({
        data: getZippeableBlob(workbookMetrics),
        name: `${filename}_metrics.xlsx`,
      });

      results.push({
        data: getZippeableBlob(workbookAnnotations),
        name: `${filename}_annotations.xlsx`,
      });

      results.push({
        data: getZippeableBlob(workbookDescriptive),
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
    document ? [document] : data.documentsOptQuery
  );
  download_progress.value.current++;

  // All metrics
  const workbookMetrics = XLSX.utils.book_new();
  const workbookAnnotations = XLSX.utils.book_new();
  const workbookDescriptive = XLSX.utils.book_new();
  for (let i = 0; i < data.labelsOptions.length; i++) {
    const label = data.labelsOptions[i];

    const annotations = await getAnnotations(
      data.task_id,
      [label],
      document ? [document] : data.documentsOptQuery,
      data.annotators,
      data.byWords,
      data.hideNonText,
      data.documentLevel
    );

    const metrics = await compute_metrics(
      data.task_id,
      label,
      document ? [document] : data.documentsOptQuery,
      data.annotators,
      data.annotatorsOrEmpty,
      data.tolerance,
      data.byWords,
      data.hideNonText,
      data.contained,
      data.documentLevel,
      data.documentsData,
      data.documentsOptions,
      annotations
    );

    const metrics_sheet = await getMetricsSheet(
      metrics,
      label,
      document ? [document] : data.documentsOptQuery,
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

    let sheetName = label.substring(0, 31);

    // works as long as there are less than 100 labels
    if (label.length > 31) {
      const range = i + 1 > 9 ? 12 : 13;
      sheetName = `${i + 1}-${label.substring(0, 13)}...${label.substring(label.length - range)}`;
    }

    XLSX.utils.book_append_sheet(workbookMetrics, metrics_sheet, sheetName);
    XLSX.utils.book_append_sheet(workbookAnnotations, annotations_sheet, sheetName);
    XLSX.utils.book_append_sheet(workbookDescriptive, descriptive_anns_sheet, sheetName);

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
    if (m.result !== undefined) {
      rows.push({
        metric: m.name,
        annotators: data.annotators.join(","),
        value: m.result,
        p0: m.po,
        pe: m.pe
      });

      if (!isDocumentLevel(task.value!)) {
        Object.assign(rows.at(-1),
          {
            tolerance: data.tolerance,
            consider_contained: data.contained ? "yes" : "no"
          })
      }
    }
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
          data.documentLevel,
          data.documentsData,
          data.documentsOptions
        );

        metrics.map((m) => {
          if (m.result !== undefined) {
            rows.push({
              metric: m.name,
              annotators: data.annotators[i] + "," + data.annotators[j],
              value: m.result,
              p0: m.po,
              pe: m.pe
            });

            if (!isDocumentLevel(task.value!)) {
              Object.assign(rows.at(-1),
                {
                  tolerance: data.tolerance,
                  consider_contained: data.contained ? "yes" : "no"
                })
            }
          }

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
          value: v,
          confidence: r.confidences[k],
        });

        if (!isDocumentLevel(task.value!)) {
          Object.assign(rows.at(-1),
            {
              start: r.start,
              end: r.end,
              text: r.text?.length ? (r.text.length <= 1000 ? r.text : `${r.text.substring(0, 100)} ... ${r.text.substring(900, 1000)}`) : "",
            })
        }
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
        annotations: dic[k]["amount"]
      });

      if (!isDocumentLevel(task.value!)) {
        Object.assign(rows.at(-1),
          {
            non_annotations: nanns,
          })
      }
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
  const workbookConfidence = XLSX.utils.book_new();
  const diff_metric_body = JSON.stringify({
    task_id: task_id,
    annotators_length: annotators_length,
    annotators: annotators,
    documents: documents,
  });

  const dm = await $fetch("/api/metrics/confidence", {
    method: "POST",
    body: diff_metric_body,
  });

  const worksheetConfidence = XLSX.utils.json_to_sheet([
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

  const worksheetConfidenceAnnotator = XLSX.utils.json_to_sheet(
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
    workbookConfidence,
    worksheetConfidence,
    "Confidence Metrics"
  );

  XLSX.utils.book_append_sheet(
    workbookConfidence,
    worksheetConfidenceAnnotator,
    "Annotators "
  );
  return workbookConfidence;
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
//#endregion

onMounted(async () => {
  const urlHash = route.hash.substring(1);
  metricsTypeActiveTab.value = urlHash == MetricTypes.AGREEMENT ? 1 : 0;

  loading_options.value = true;

  task.value = await $trpc.task.findById.query(+route.params.task_id);

  project.value = await $trpc.project.findById.query(+route.params.project_id);

  labelsOptions.push(
    ...(await $trpc.labelset.findById.query(+task.value.labelset_id)).labels
  );

  annotatorsOptions.push(
    ...(await $trpc.user.findUsersByTask.query(+task.value.id)).map((a) => a.email!)
  );

  allDocumentsOptions.push(
    ...(await $trpc.document.findDocumentsByTask.query(+task.value.id)).map((d) => {
      if (!(d.id in documentsNames.value)) {
        documentsNames.value[d.id] = d.name;
      }
      return { value: d.id.toString(), label: d.id.toString() + " - " + d.name };
    })
  );

  if (annotatorsOptions.length > 1) {
    sharedDocumentsOptions.push(
      ...(await $trpc.document.findSharedDocumentsByTask.query(+task.value.id)).map((d) => {
        if (!(d.id in documentsData.value)) {
          documentsData.value[d.id] = { full_text: d.full_text, name: d.name };
        }
        return { value: d.id.toString(), label: d.id.toString() + " - " + d.name };
      })
    );
  }

  updateUrl(metricsTypeActiveTab.value);

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
