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
            <Tabs v-model:value="metricsTypeActiveTab" @update:value="updateUrl($event)">
              <TabList>
                <Tab :value="0" class="!py-3">Descriptive</Tab>
                <Tab :value="1" :disabled="annotatorsOptions.length < 2" class="!py-3">Agreement</Tab>
              </TabList>
              <TabPanels>
              <TabPanel :value="0">
                <ParametersColumn :metric-type="MetricTypes.DESCRIPTIVE" :labels-options="labelsOptions"
                  :annotators-options="annotatorsOptions" :documents-options="allDocumentsOptions"
                  :showNonDocumentLevelAgreementParams="false" v-model:selectedLabelsOrEmpty="selectedLabelsOrEmpty"
                  v-model:selectedDocumentsOrEmpty="allSelectedDocumentsOrEmpty"
                  v-model:selectedAnnotatorsOrEmpty="selectedAnnotatorsOrEmpty" @click-download-all="clickDownloadAll"
                  @update-annotations="updateAnnotations">
                </ParametersColumn>
              </TabPanel>
              <TabPanel :value="1">
                <ParametersColumn :metric-type="MetricTypes.AGREEMENT" :labels-options="labelsOptions"
                  :annotators-options="annotatorsOptions" :documents-options="documentsOptions"
                  :showNonDocumentLevelAgreementParams="task && !isDocumentLevel(task)"
                  v-model:selectedLabelsOrEmpty="selectedLabelsOrEmpty"
                  v-model:selectedDocumentsOrEmpty="sharedSelectedDocumentsOrEmpty"
                  v-model:selectedAnnotatorsOrEmpty="selectedAnnotatorsOrEmpty"
                  v-model:contained="contained" v-model:wordGranularity="wordGranularity"
                  @click-compute-metrics="clickComputeMetrics" @click-download-all="clickDownloadAll"
                  @update-annotations="updateAnnotations">
                </ParametersColumn>
              </TabPanel>
              </TabPanels>
            </Tabs>
          </div>
        </aside>
        <AnnotationsList v-model:annotations="annotations" v-model:loading_annotations="loading_annotations"
          :labels="labelsOptions" :loading="loading" :documentsData="documentsData" :metricType="metricType"
          :documentUrl="`/projects/${project.id}/tasks/${task.id}/documents`"></AnnotationsList>
      </div>
    </div>
    <ResultsModal v-if="metricsResult" v-model:visible="metricsModalVisible" :metricResults="metricsResult"
      :loading="computingMetrics"></ResultsModal>
  </div>
</template>
<script setup lang="ts">
import Breadcrumb from "~/components/Breadcrumb.vue";
import AnnotationsList from "~/components/metrics/AnnotationsList.vue";
import ResultsModal from "~/components/metrics/ResultsModal.vue";
import ParametersColumn from "~/components/metrics/ParametersColumn.vue";
import * as XLSX from "xlsx";
import type { Task, Project } from "~/types";
import type { RichAnnotation } from "~/utils/metrics";
import type { IaaMetricsResponse } from "~/utils/iaa";
import { MetricTypes } from "~/utils/enums";
import { isDocumentLevel } from "~/utils/levels";
import DimmerProgress from "~/components/DimmerProgress.vue";
import Dimmer from "~/components/Dimmer.vue";
import fileSaver from "file-saver";
import JSZip from "jszip";
import { authorizeClient } from "~/utils/authorize.client";

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
const metricsResult = ref<IaaMetricsResponse>();
const computingMetrics = ref<boolean>(false);
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

const allDocumentsOptions = reactive<{ value: string; label: string }[]>([]);
const sharedDocumentsOptions = reactive<{ value: string; label: string }[]>([]);
const documentsOptions = computed(() => {
  return metricType.value == MetricTypes.DESCRIPTIVE ? allDocumentsOptions : sharedDocumentsOptions;
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

const wordGranularity = ref(false);
const contained = ref(false);

// annotations
const annotations_limit = 10 ** 6;
const loading_annotations = ref(false);
const annotations = reactive<RichAnnotation[]>([]);
const documentsData = ref<any>({});
const documentsNames = ref<any>({});

const loading = computed((): boolean => {
  return (loading_annotations.value ||
    download_progress.value.loading ||
    computingMetrics.value ||
    loading_options.value) as boolean;
});

const getAnnotations = async (
  task_id: string,
  labels: string[],
  documents: string[],
  annotators: string[],
  intra: boolean = false
) => {
  const body = JSON.stringify({
    task_id: task_id,
    labels: labels,
    documents: documents,
    annotators: annotators,
    intra: intra
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
        selectedAnnotatorsOrEmpty.value!
      );
      if (anns.length < annotations_limit) annotations.push(...anns);
      loading_annotations.value = false;
    } catch (error) {
      loading_annotations.value = false;
    }
  }
};

const iaaRequestBody = () => ({
  task_id: task.value!.id,
  labelset_id: task.value!.labelset_id,
  annotation_level: isDocumentLevel(task.value!) ? "document" : undefined,
  documents: selectedDocumentsOptQuery.value.map((d) => +d),
  annotators: selectedAnnotatorsOrEmpty.value,
  labels: selectedLabelsOrEmpty.value,
  criterion: contained.value ? "contained" : "exact",
  granularity: wordGranularity.value ? "word" : "char",
});

const clickComputeMetrics = async () => {
  if (!task.value) {
    $toast.error("Task does not exist");
    throw new Error("Task does not exist");
  }
  metricsModalVisible.value = true;
  computingMetrics.value = true;
  try {
    metricsResult.value = await $fetch<IaaMetricsResponse>("/api/iaa/metrics", {
      method: "POST",
      body: JSON.stringify(iaaRequestBody()),
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

  download_progress.value.current = 0;
  download_progress.value.loading = true;
  try {
    if (metricType.value == MetricTypes.AGREEMENT) {
      download_progress.value.message = "Generating report...";
      const blob = await $fetch<Blob>("/api/iaa/report-zip", {
        method: "POST",
        body: JSON.stringify(iaaRequestBody()),
        timeout: 300000, // 5 minutes timeout
        responseType: "blob",
      });

      download_progress.value.message = "Downloading...";
      saveAs(blob, `${task.value.name}.zip`);
      download_progress.value.loading = false;
      $toast.success(`One .zip file has been downloaded!`);
      return;
    }

    download_progress.value.message = "Extracting annotations...";
    const blobs = await download_all_csv({
      task_id: task.value?.id.toString()!,
      labelsOptions: labelsOptions.map((l) => l.name),
      documents: selectedDocuments.value,
      documentsOrEmpty: selectedDocumentsOptQuery.value,
      annotators: selectedAnnotators.value,
    });

    download_progress.value.message = "Generating files..."
    const zip = JSZip();
    for (let i = 0; i < blobs.length; i++) {
      const b = await (await fetch(blobs[i].data)).blob();
      zip.file(`${blobs[i].name}`, b);
    }
    const blob_zip = await zip.generateAsync({ type: "blob" });

    download_progress.value.message = "Downloading..."
    saveAs(blob_zip, `${task.value?.name}.zip`);
    download_progress.value.loading = false;
    $toast.success(`One .zip file has been downloaded!`);
  } catch (error) {
    download_progress.value.loading = false;
  }
};

//#region CSV

//#region INTER-ANNOTATOR-AGREEMENT 

// DESCRIPTIVE
async function download_all_csv(data: any) {
  let results: { data: string; name: string }[] = [];
  download_progress.value.total =
    (selectedDocuments.value.length + 1) * labelsOptions.length;
  try {
    const baseName: string = "annotations.xlsx";

    if (data.documents.length > 1) {
      const { workbookAnnotations } = await createBlobs(data);
      results.push({
        data: getZippeableBlob(workbookAnnotations),
        name: `_${baseName}`
      });
      download_progress.value.current += data.labelsOptions.length;
    }

    // Per document
    for (let i = 0; i < data.documents.length; i++) {
      const document = data.documents[i];
      const filename = `${document}-${documentsNames.value[document].split('.')[0]}`;
      const { workbookAnnotations } = await createBlobs(data, document);
      results.push({
        data: getZippeableBlob(workbookAnnotations),
        name: `${filename}_${baseName}`
      });
      download_progress.value.current += data.labelsOptions.length;
    }

    return results;
  } catch (error) { console.error(error) }
  return [];
}

async function createBlobs(data: any, document?: any) {

  const promises: Promise<any>[] = [];
  const names: string[] = [];
  for (let i = 0; i < data.labelsOptions.length; i++) {
    const label = data.labelsOptions[i];

    promises.push(getAnnotations(
      data.task_id,
      [label],
      document ? [document] : data.documentsOrEmpty,
      data.annotators,
      false //assumes that in descriptive page is always inter son the annotator names are the same (without the taskId)
    ));

    let sheetName = label.substring(0, 31);

    // works as long as there are less than 100 labels
    if (label.length > 31) {
      const range = i + 1 > 9 ? 12 : 13;
      sheetName = `${i + 1}-${label.substring(0, 13)}...${label.substring(label.length - range)}`;
    }

    names.push(sheetName);
  }

  const annotations = await Promise.all(promises);
  const workbookAnnotations = XLSX.utils.book_new();

  annotations.forEach((anns, index) => {
    const annotations_sheet = XLSX.utils.json_to_sheet(anns.filter(a => a.label !== "NOT ANNOTATED").map(annotation => {
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

    XLSX.utils.book_append_sheet(workbookAnnotations, annotations_sheet, names[index]);
  });

  return { workbookAnnotations };
}
//#endregion

//#endregion

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
