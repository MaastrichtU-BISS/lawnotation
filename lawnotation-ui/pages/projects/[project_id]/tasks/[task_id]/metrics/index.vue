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
    <div>
      <aside
        id="logo-sidebar"
        class="fixed left-0 z-40 w-80 side-panel-h transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700"
        aria-label="Sidebar"
        style="margin-top: inherit"
      >
        <div class="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
          <ul class="space-y-2 text-sm">
            <li>
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
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
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
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
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
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
            <li class="text-center">
              <span class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300"
                >Annotations</span
              >
              <label class="relative inline-flex items-center mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  value=""
                  class="sr-only peer"
                  @input="
                    ($event: Event) => {
                      $event.target.checked ? wordsClicked() : defaultClicked();
                    }
                  "
                />

                <div
                  class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
              </label>
              <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300"
                >Words</span
              >
            </li>
            <li>
              <button
                :disabled="
                  !selectedDocuments || !selectedLabel || selectedAnnotators?.length == 1
                "
                :class="{ 'cursor-wait': loading }"
                class="w-full flex justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                @click="compute_metric(annotations, selectedAnnotators!, tolerance)"
              >
                <span
                  v-if="
                    !metrics_result.loading_cohens_kappa &&
                    !metrics_result.loading_fleiss_kappa &&
                    !metrics_result.loading_krippendorf
                  "
                  >Compute Metrics</span
                >
                <template v-else>
                  <svg
                    aria-hidden="true"
                    class="inline w-6 text-gray-200 animate-spin dark:text-gray-600 fill-slate-400"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                  <span class="sr-only">Loading...</span>
                </template>
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
                      <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                        <th
                          scope="row"
                          class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                        >
                          Krippendorff's alpha
                        </th>
                        <td class="px-6 py-4">
                          {{ metrics_result?.krippendorff?.result?.toFixed(3) ?? "" }}
                        </td>
                      </tr>
                      <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                        <th
                          scope="row"
                          class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                        >
                          Fleiss Kappa
                        </th>
                        <td class="px-6 py-4">
                          {{ metrics_result?.fleiss_kappa?.result?.toFixed(3) ?? "" }}
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
                          {{ metrics_result?.cohens_kappa?.result?.toFixed(3) ?? "" }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </li>
              <li class="">
                <button
                  :disabled="!metrics_result"
                  class="w-full flex justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
                  @click="downloadAll"
                >
                  Download as excel
                </button>
              </li>
            </ul>
          </ul>
        </div>
      </aside>
      <div class="px-4 sm:ml-64 side-panel-h" style="margin-left: 20rem">
        <div class="">
          <div v-if="annotations && annotations.length">
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
</template>
<script setup lang="ts">
import { ExportToCsv } from "export-to-csv";
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

const loading = ref(false);
const separate_into_words = ref(false);

const annotations = reactive<RichAnnotation[]>([]);
const metrics_result = ref<{
  loading_krippendorf: Boolean;
  loading_fleiss_kappa: Boolean;
  loading_cohens_kappa: Boolean;
  krippendorff: MetricResult | undefined;
  fleiss_kappa: MetricResult | undefined;
  cohens_kappa: MetricResult | undefined;
}>({
  krippendorff: undefined,
  fleiss_kappa: undefined,
  cohens_kappa: undefined,
  loading_krippendorf: false,
  loading_fleiss_kappa: false,
  loading_cohens_kappa: false,
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
    $toast.error(`Invalid Label`);
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
    $toast.error(`Invalid Label`);
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
  loading.value = true;
  metrics_result.value = {
    krippendorff: undefined,
    fleiss_kappa: undefined,
    cohens_kappa: undefined,
    loading_krippendorf: false,
    loading_fleiss_kappa: false,
    loading_cohens_kappa: false,
  };
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

  loading.value = false;
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

const compute_metric = async (
  annotations: RichAnnotation[],
  annotators: string[],
  tolerance: number
) => {
  metrics_result.value = {
    krippendorff: undefined,
    fleiss_kappa: undefined,
    cohens_kappa: undefined,
    loading_krippendorf: false,
    loading_fleiss_kappa: false,
    loading_cohens_kappa: false,
  };

  if (!annotations || annotations.length == 0) {
    $toast.error(`There are no annotations!`);
    return;
  }

  const body = JSON.stringify({
    annotations: annotations.filter((x) => !x.hidden),
    annotators: annotators,
    tolerance: tolerance,
  });

  if (annotators.length > 2) {
    metrics_result.value.loading_krippendorf = true;
    $fetch(`/api/metrics/krippendorff`, {
      method: "POST",
      body: body,
    })
      .then((result) => {
        metrics_result.value.krippendorff = result as MetricResult;
        metrics_result.value.loading_krippendorf = false;
      })
      .catch((error) => {
        metrics_result.value.loading_krippendorf = false;
      });
    metrics_result.value.loading_fleiss_kappa = true;
    $fetch(`/api/metrics/fleiss_kappa`, {
      method: "POST",
      body: body,
    })
      .then((result) => {
        metrics_result.value.fleiss_kappa = result as MetricResult;
        metrics_result.value.loading_fleiss_kappa = false;
      })
      .catch((error) => {
        metrics_result.value.loading_fleiss_kappa = false;
        console.log(error);
      });
  } else if (annotators.length == 2) {
    metrics_result.value.loading_cohens_kappa = true;
    $fetch(`/api/metrics/cohens_kappa`, {
      method: "POST",
      body: body,
    })
      .then((result) => {
        metrics_result.value.cohens_kappa = result as MetricResult;
        metrics_result.value.loading_cohens_kappa = false;
      })
      .catch((error) => {
        metrics_result.value.loading_cohens_kappa = false;
      });
  }
};

const getDownloadOptions = async (d: string, l: string) => {
  // const options = await {
  //   filename: `${d}_${l}_${metric_result.value?.name}`,
  //   fieldSeparator: ",",
  //   quoteStrings: '"',
  //   decimalSeparator: ".",
  //   showLabels: true,
  //   showTitle: true,
  //   title: `${metric_result.value?.name} result: ${metric_result.value?.result} | Po: ${metric_result.value?.po} | Pe: ${metric_result.value?.pe} | Tolerance: ${tolerance.value}`,
  //   useTextFile: false,
  //   useBom: true,
  //   useKeysAsHeaders: true,
  // };
  // return options;
};

const downloadCSV = async () => {
  // if (!selectedDocumentsName.value) {
  //   $toast.error(`Invalid Document`);
  //   return;
  // }
  // if (!selectedLabel.value) {
  //   $toast.error(`Invalid Label`);
  //   return;
  // }
  // const options = await getDownloadOptions(
  //   selectedDocumentsName.value,
  //   selectedLabel.value
  // );
  // const csvExporter = new ExportToCsv(options);
  // var rows: any[] = [];
  // metric_result.value?.table.forEach((r: any) => {
  //   Object.entries(r.annotators).forEach(([k, v]) => {
  //     rows.push({
  //       annotator: k,
  //       start: r.start,
  //       end: r.end,
  //       text: r.text,
  //       value: v,
  //     });
  //   });
  // });
  // csvExporter.generateCsv(rows);
};

const downloadAll = async () => {
  // let count: number = 0;
  // for (let i = 0; i < documentsOptions.length; i++) {
  //   for (let j = 0; j < labelsOptions.length; j++) {
  //     selectedDocuments.value = documentsOptions[i].value;
  //     selectedLabel.value = labelsOptions[j];
  //     await getAnnotations();
  //     if (annotations.length > 0) count++;
  //     await compute_metric("fleiss_kappa");
  //     await downloadCSV();
  //     await compute_metric("krippendorff");
  //     await downloadCSV();
  //   }
  // }
  // $toast.success(`${count * 2} csv files have been downloaded!`);
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
};

const separateIntoWords = (annotations: RichAnnotation[]) => {
  metrics_result.value = {} as any;
  let limit = 10 ** 6;
  loading.value = true;
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
  loading.value = false;
  return new_annotations;
};

const defaultClicked = () => {
  separate_into_words.value = false;
  getAnnotations(
    task.value?.id.toString()!,
    selectedLabel.value!,
    selectedDocuments.value!,
    selectedAnnotators.value!
  );
};

const wordsClicked = () => {
  separate_into_words.value = true;
  getAnnotations(
    task.value?.id.toString()!,
    selectedLabel.value!,
    selectedDocuments.value!,
    selectedAnnotators.value!
  );
};

const emitMergeUp = (ann_index: number): void => {
  const current = _.clone(annotations[ann_index]);
  const previous = _.clone(annotations[ann_index - 1]);

  annotations[ann_index - 1].end = current.end;
  annotations[ann_index - 1].text = current.doc_text.substring(
    previous.start,
    current.end
  )!;

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
};

const emitMergeDown = (ann_index: number): void => {
  const current = _.clone(annotations[ann_index]);
  const next = _.clone(annotations[ann_index + 1]);

  annotations[ann_index + 1].start = current.start;
  annotations[ann_index + 1].text = current.doc_text.substring(current.start, next.end);

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
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
