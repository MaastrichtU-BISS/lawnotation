<template>
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
            <button class="btn btn-primary mx-5" @click="getAnnotations">
              Get Annotations
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
              class="btn btn-primary mx-5"
              @click="compute_kappa('fleiss')"
            >
              Fleiss Kappa
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
            <button
              :disabled="
                !selectedDocument || !selectedLabel || selectedAnnotators?.length != 2
              "
              class="btn btn-primary mx-5"
              @click="compute_kappa('cohens')"
            >
              Cohens Kappa
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="text-center" v-if="kappa_result">
      <div class="my=5">
        <h5 class="text-lg font-semibold">
          Result:
          <span :style="'color:' + (kappa_result.result > 0 ? 'green' : 'red')">{{
            kappa_result.result
          }}</span>
        </h5>
        <div><b>Po:</b> {{ kappa_result.po }}</div>
        <div><b>Pe:</b> {{ kappa_result.pe }}</div>
      </div>
      <div class="my-5">
        <button class="btn btn-primary mx-5" @click="downloadCSV()">
          Download as CSV
        </button>
      </div>
    </div>
    <div v-if="annotations && annotations.length">
      <h5 class="text-lg font-semibold my-5">Annotations</h5>
      <ul>
        <li v-for="(ann, index) in annotations">
          <RangeLabelCmpt
            :annotation="ann"
            :editable="ann.label == 'NOT ANNOTATED'"
            :index="index"
            :has-previous-non-annotation="hasPreviousNonAnnotation(index)"
            :has-next-non-annotation="hasNextNonAnnotation(index)"
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
import { User, useUserApi } from "~/data/user";
import { KappaResult, RangeLabel, sortByRange } from "~/utils/metrics";
import { clone } from "lodash";

const config = useRuntimeConfig();
const { $toast } = useNuxtApp();

// const user = useSupabaseUser();
const taskApi = useTaskApi();
const assignmentApi = useAssignmentApi();
const annotationApi = useAnnotationApi();
const documentApi = useDocumentApi();
const labelsetApi = useLabelsetApi();
const userApi = useUserApi();

const route = useRoute();
const task = ref<Task>();

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

const annotations = reactive<BasicAnnotation[]>([]);
const kappa_result = ref<KappaResult>();

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
  kappa_result.value = undefined;
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
        };
      })
    );

  getNonAnnotations();

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
  });

  annotations.splice(0) && annotations.push(...new_annotations);
  console.log("ann", annotations);
};

const compute_kappa = async (variant: string) => {
  loading.value = true;

  if (!selectedDocumentText.value || !selectedDocumentName.value)
    throw new Error("Invalid Document");

  if (!annotations || annotations.length == 0) {
    $toast.error(
      `There are no annotations for document ${selectedDocumentName.value} and label ${selectedLabel.value}`
    );
    kappa_result.value = undefined;
    return;
  }

  kappa_result.value = await $fetch(`/api/metrics/${variant}_kappa`, {
    method: "POST",
    body: JSON.stringify({
      annotations: annotations.filter((x) => !x.hidden),
      annotators: selectedAnnotators.value,
      tolerance: tolerance.value,
    }),
  });

  console.log(kappa_result.value);

  loading.value = false;
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
  const options = {
    filename: `${selectedDocumentName.value}_${selectedLabel.value}`,
    fieldSeparator: ",",
    quoteStrings: '"',
    decimalSeparator: ".",
    showLabels: true,
    showTitle: true,
    title: `${kappa_result.value?.variant}Kappa: ${kappa_result.value?.result} | Po: ${kappa_result.value?.po} | Pe: ${kappa_result.value?.pe} | Tolerance: ${tolerance.value}`,
    useTextFile: false,
    useBom: true,
    useKeysAsHeaders: true,
  };

  const csvExporter = new ExportToCsv(options);

  var rows: any[] = [];
  kappa_result.value?.table.forEach((r: any) => {
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

const hasPreviousNonAnnotation = (index: number): Boolean => {
  return (
    index > 0 &&
    annotations[index - 1].label == "NOT ANNOTATED" &&
    annotations[index].label == "NOT ANNOTATED"
  );
};

const hasNextNonAnnotation = (index: number): Boolean => {
  return (
    index < annotations.length - 1 &&
    annotations[index + 1].label == "NOT ANNOTATED" &&
    annotations[index].label == "NOT ANNOTATED"
  );
};

const emitSeparate = (ann_index: number, split_pos: number) => {
  const curr_end = annotations[ann_index].end;
  const curr_start = annotations[ann_index].start;
  const curr_text = annotations[ann_index].text;

  annotations[ann_index].end = curr_start + split_pos;
  annotations[ann_index].text = curr_text.substring(0, split_pos);

  annotations.splice(ann_index + 1, 0, {
    start: curr_start + split_pos,
    end: curr_end,
    label: "NOT ANNOTATED",
    text: curr_text.substring(split_pos, curr_end),
    annotator: "",
    hidden: false,
  });
};

const emitMergeUp = (ann_index: number): void => {
  const curr_end = annotations[ann_index].end;
  const curr_text = annotations[ann_index].text;

  annotations[ann_index - 1].end = curr_end;
  annotations[ann_index - 1].text += curr_text;

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
};

const emitMergeDown = (ann_index: number): void => {
  const curr_start = annotations[ann_index].start;
  const curr_text = annotations[ann_index].text;

  annotations[ann_index + 1].start = curr_start;
  annotations[ann_index + 1].text = curr_text + annotations[ann_index + 1].text;

  annotations[ann_index].hidden = false;
  annotations.splice(ann_index, 1);
};

const emitSetHidden = (ann_index: number, hidden: Boolean): void => {
  annotations[ann_index].hidden = hidden;
};

onMounted(async () => {
  task.value = await taskApi.findTask(route.params.task_id.toString());

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
