<template>
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

  <div class="my-3">
    <div class="dimmer-wrapper" style="min-height: 200px">
      <Dimmer v-model="loading" />
      <div class="dimmer-content">
        <div class="flex my-10">
          <div class="mr-5 w-full">
            <label>Document</label>
            <Multiselect
              v-model="selectedDocument"
              :options="documentsOptions"
              :searchable="true"
              placeholder="Select a Document"
            />
          </div>
          <div class="w-full">
            <label>Label</label>
            <Multiselect
              v-model="selectedLabel"
              :options="labelsOptions"
              :searchable="true"
              placeholder="Select a Label"
            />
          </div>
          <div class="ml-5 w-full">
            <label>Annotators</label>
            <Multiselect
              v-model="selectedAnnotators"
              :options="annotatorsOptions"
              mode="tags"
              :searchable="true"
              :close-on-select="false"
              placeholder="All"
            />
          </div>
        </div>
        <div class="flex my-10">
          <div class="mx-auto">
            <button class="base btn-primary mx-5" @click="getAnnotations">
              Get Annotations
            </button>
            <span>
              <input
                checked
                id="radio-default"
                type="radio"
                @click="defaultClicked"
                name="radio"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
              />
              <label for="radio-default" class="ml-2 text-sm font-medium text-gray-900"
                >Default</label
              >
            </span>
            <span class="ml-4">
              <input
                id="radio-words"
                type="radio"
                @click="wordsClicked"
                name="radio"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
              />
              <label for="radio-words" class="ml-2 text-sm font-medium text-gray-900"
                >Words</label
              ></span
            >
            <button class="base btn-primary mx-5" @click="downloadAll">
              Download All
            </button>
          </div>
        </div>
        <div class="flex my-10" v-if="annotations && annotations.length">
          <div class="mx-auto inline-flex">
            <button
              :disabled="
                !selectedDocument ||
                !selectedLabel ||
                selectedAnnotators?.length == 1 ||
                selectedAnnotators?.length == 2
              "
              class="base btn-primary mx-5"
              @click="compute_metric('krippendorff')"
            >
              Krippendorff's alfa
            </button>
            <button
              :disabled="
                !selectedDocument ||
                !selectedLabel ||
                selectedAnnotators?.length == 1 ||
                selectedAnnotators?.length == 2
              "
              class="base btn-primary mx-5"
              @click="compute_metric('fleiss_kappa')"
            >
              Fleiss Kappa
            </button>
            <button
              :disabled="
                !selectedDocument || !selectedLabel || selectedAnnotators?.length != 2
              "
              class="base btn-primary mx-5"
              @click="compute_metric('cohens_kappa')"
            >
              Cohens Kappa
            </button>
            <div class="">
              <label class="mr-2">Tolerance</label>
              <input
                class=""
                type="number"
                v-model="tolerance"
                min="0"
                max="10"
                step="1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="text-center" v-if="metric_result">
      <div class="my=5">
        <h5 class="text-lg font-semibold">
          Result:
          <span :style="'color:' + (metric_result.result > 0 ? 'green' : 'red')">{{
            metric_result.result
          }}</span>
        </h5>
        <div><b>Po:</b> {{ metric_result.po }}</div>
        <div><b>Pe:</b> {{ metric_result.pe }}</div>
      </div>
      <div class="my-5">
        <button class="base btn-primary mx-5" @click="downloadCSV()">
          Download Result
        </button>
      </div>
    </div>
    <div v-if="annotations && annotations.length">
      <h5 class="text-lg font-semibold my-5">Annotations: {{ annotations.length }}</h5>
      <ul>
        <li v-for="(ann, index) in annotations">
          <RangeLabelCmpt
            :annotation="ann"
            :index="index"
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
</template>
<script setup lang="ts">
import { ExportToCsv } from "export-to-csv";
import Multiselect from "@vueform/multiselect";
import { Task, useTaskApi } from "~/data/task";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { BasicAnnotation, useAnnotationApi } from "~/data/annotation";
import { Document, useDocumentApi } from "~/data/document";
import { Labelset, useLabelsetApi } from "~/data/labelset";
import { Project, useProjectApi } from "~/data/project";
import { User, useUserApi } from "~/data/user";
import { MetricResult, RangeLabel, sortByRange } from "~/utils/metrics";
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
const selectedDocument = ref<string>();
const selectedDocumentText = ref<string>();
const selectedDocumentName = ref<string>();

const annotatorsOptions = reactive<string[]>([]);
const selectedAnnotators = ref<string[]>();

const labelsOptions = reactive<string[]>([]);
const selectedLabel = ref<string>();

const tolerance = ref<number>(0);

const loading = ref(false);
const separate_into_words = ref(false);

const annotations = reactive<BasicAnnotation[]>([]);
const metric_result = ref<MetricResult>();

const getAnnotations = async () => {
  if (!task.value) {
    $toast.error(`Invalid Task`);
    return;
  }
  if (!selectedDocument.value) {
    $toast.error(`Invalid Document`);
    return;
  }
  if (!selectedLabel.value) {
    $toast.error(`Invalid Label`);
    return;
  }

  if (!selectedAnnotators.value || selectedAnnotators.value.length == 0) {
    selectedAnnotators.value = [];
    selectedAnnotators.value.push(...annotatorsOptions);
  }

  loading.value = true;
  metric_result.value = undefined;
  annotations.splice(0);

  const d = await documentApi.findDocument(selectedDocument.value);
  selectedDocumentText.value = d.full_text;
  selectedDocumentName.value = d.name.substring(0, d.name.length - 4);

  const anns = await annotationApi.findAnnotationsByTaskAndDocumentAndLabelsAndAnnotators(
    task.value.id.toString(),
    selectedDocument.value,
    selectedLabel.value,
    selectedAnnotators.value
  );

  annotations.splice(0) &&
    annotations.push(
      ...anns.map((a) => {
        return {
          start: a.start_index,
          end: a.end_index,
          text: a.text,
          label: a.label,
          annotator: (a as any).assignment.annotator.email,
          hidden: false,
          ann_id: a.id,
        };
      })
    );

  getNonAnnotations();

  if (separate_into_words.value) {
    separateIntoWords();
  }

  loading.value = false;
};

const getNonAnnotations = async () => {
  if (!selectedDocumentText.value) {
    $toast.error(`Invalid Document`);
    return;
  }

  sortByRange(annotations);
  var new_annotations: BasicAnnotation[] = [];

  var last_end = 0;
  for (let i = 0; i < annotations.length; ++i) {
    var current_start = annotations[i].start;
    if (last_end < current_start) {
      new_annotations.push({
        start: last_end,
        end: current_start,
        label: "NOT ANNOTATED",
        text: selectedDocumentText.value.substring(last_end, current_start),
        annotator: "",
        hidden: false,
        ann_id: -1,
      });
    }
    new_annotations.push(annotations[i]);
    var last_end = Math.max(last_end, annotations[i].end);
  }

  new_annotations.push({
    start: last_end,
    end: selectedDocumentText.value.length,
    label: "NOT ANNOTATED",
    text: selectedDocumentText.value.substring(
      last_end,
      selectedDocumentText.value.length
    ),
    annotator: "",
    hidden: false,
    ann_id: -1,
  });

  annotations.splice(0) && annotations.push(...new_annotations);
};

const compute_metric = async (metric: string) => {
  loading.value = true;

  if (!selectedDocumentText.value || !selectedDocumentName.value)
    throw new Error("Invalid Document");

  if (!annotations || annotations.length == 0) {
    $toast.error(
      `There are no annotations for document ${selectedDocumentName.value} and label ${selectedLabel.value}`
    );
    metric_result.value = undefined;
    return;
  }

  metric_result.value = await $fetch(`/api/metrics/${metric}`, {
    method: "POST",
    body: JSON.stringify({
      annotations: annotations.filter((x) => !x.hidden),
      annotators: selectedAnnotators.value,
      tolerance: tolerance.value,
    }),
  });

  loading.value = false;
};

const getDownloadOptions = async (d: string, l: string) => {
  const options = await {
    filename: `${d}_${l}_${metric_result.value?.name}`,
    fieldSeparator: ",",
    quoteStrings: '"',
    decimalSeparator: ".",
    showLabels: true,
    showTitle: true,
    title: `${metric_result.value?.name} result: ${metric_result.value?.result} | Po: ${metric_result.value?.po} | Pe: ${metric_result.value?.pe} | Tolerance: ${tolerance.value}`,
    useTextFile: false,
    useBom: true,
    useKeysAsHeaders: true,
  };
  return options;
};

const downloadCSV = async () => {
  if (!selectedDocumentName.value) {
    $toast.error(`Invalid Document`);
    return;
  }
  if (!selectedLabel.value) {
    $toast.error(`Invalid Label`);
    return;
  }
  const options = await getDownloadOptions(
    selectedDocumentName.value,
    selectedLabel.value
  );

  const csvExporter = new ExportToCsv(options);

  var rows: any[] = [];
  metric_result.value?.table.forEach((r: any) => {
    Object.entries(r.annotators).forEach(([k, v]) => {
      rows.push({
        annotator: k,
        start: r.start,
        end: r.end,
        text: r.text,
        value: v,
      });
    });
  });

  csvExporter.generateCsv(rows);
};

const downloadAll = async () => {
  let count: number = 0;
  for (let i = 0; i < documentsOptions.length; i++) {
    for (let j = 0; j < labelsOptions.length; j++) {
      selectedDocument.value = documentsOptions[i].value;
      selectedLabel.value = labelsOptions[j];
      await getAnnotations();
      if (annotations.length > 0) count++;
      await compute_metric("fleiss_kappa");
      await downloadCSV();
      await compute_metric("krippendorff");
      await downloadCSV();
    }
  }
  $toast.success(`${count * 2} csv files have been downloaded!`);
};

const canMergeUp = (index: number): Boolean => {
  return index > 0 && annotations[index - 1].ann_id == annotations[index].ann_id;
};

const canMergeDown = (index: number): Boolean => {
  return (
    index < annotations.length - 1 &&
    annotations[index + 1].ann_id == annotations[index].ann_id
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
  });
};

const separateIntoWords = () => {
  metric_result.value = undefined;
  let limit = 10 ** 6;
  loading.value = true;
  var new_annotations: BasicAnnotation[] = [];

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
      });
      limit--;
    }
  });
  annotations.splice(0) && annotations.push(...new_annotations);
  loading.value = false;
};

const defaultClicked = () => {
  separate_into_words.value = false;
  if (annotations && annotations.length) {
    getAnnotations();
  }
};

const wordsClicked = () => {
  separate_into_words.value = true;
  if (annotations && annotations.length) {
    getAnnotations();
  }
};

const emitMergeUp = (ann_index: number): void => {
  if (!selectedDocumentText.value) {
    $toast.error(`Invalid Document`);
    return;
  }
  const current = _.clone(annotations[ann_index]);
  const previous = _.clone(annotations[ann_index - 1]);

  annotations[ann_index - 1].end = current.end;
  annotations[ann_index - 1].text = selectedDocumentText.value.substring(
    previous.start,
    current.end
  )!;

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
};

const emitMergeDown = (ann_index: number): void => {
  if (!selectedDocumentText.value) {
    $toast.error(`Invalid Document`);
    return;
  }
  const current = _.clone(annotations[ann_index]);
  const next = _.clone(annotations[ann_index + 1]);

  annotations[ann_index + 1].start = current.start;
  annotations[ann_index + 1].text = selectedDocumentText.value.substring(
    current.start,
    next.end
  );

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
};

const emitSetHidden = (ann_index: number, hidden: Boolean): void => {
  annotations[ann_index].hidden = hidden;
};

onMounted(async () => {
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
</style>
