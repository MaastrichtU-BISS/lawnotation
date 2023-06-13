<template>
  <div class="my-3">
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
      <div class="ml-5 w-full">
        <label>Tolerance</label>
        <input class="flex" type="number" v-model="tolerance" min="0" max="10" step="1" />
      </div>
    </div>
    <div class="flex my-10">
      <div class="mx-auto">
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
        <button class="btn btn-primary mx-5" @click="downloadCSV">Download as CSV</button>
        <pre class="text-left">{{ kappa_result.table }}</pre>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ExportToCsv } from "export-to-csv";
import Multiselect from "@vueform/multiselect";
import { Task, useTaskApi } from "~/data/task";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { Annotation, useAnnotationApi } from "~/data/annotation";
import { Document, useDocumentApi } from "~/data/document";
import { Labelset, useLabelsetApi } from "~/data/labelset";
import { User, useUserApi } from "~/data/user";
import { result } from "lodash";

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

const annotatorsOptions = reactive<string[]>([]);
const selectedAnnotators = ref<string[]>();

const labelsOptions = reactive<string[]>([]);
const selectedLabel = ref<string>();

const tolerance = ref<number>(0);

const loading = ref(false);

const kappa_result = ref();

const get_annotations = async () => {
  if (!task.value) throw new Error("Invalid Task");
  if (!selectedDocument.value) throw new Error("Invalid Document");
  if (!selectedLabel.value) throw new Error("Invalid Label");

  if (!selectedAnnotators.value || selectedAnnotators.value.length == 0) {
    selectedAnnotators.value = [];
    selectedAnnotators.value.push(...annotatorsOptions);
  }

  console.log("selected params:");
  console.log(selectedAnnotators.value);
  console.log(selectedLabel.value);
  console.log(selectedDocument.value);

  const annotations = await annotationApi.findAnnotationsByTaskAndDocumentAndLabelsAndAnnotators(
    task.value?.id.toString(),
    selectedDocument.value,
    selectedLabel.value,
    selectedAnnotators.value
  );
  return annotations;
};

const compute_kappa = async (variant: string) => {
  loading.value = true;

  const annotations = await get_annotations();

  console.log("annotations:");
  console.log(annotations);

  if (!annotations || annotations.length == 0) {
    $toast.error(`There are no annotations for the specified criteria.`);
    kappa_result.value = null;
    return;
  }

  kappa_result.value = await $fetch(`/api/metrics/${variant}_kappa`, {
    method: "POST",
    body: JSON.stringify({
      annotations: annotations
        .map((a) => {
          return {
            start: a.start_index,
            end: a.end_index,
            text: a.text,
            label: a.label,
            annotator: (a as any).assignment.annotator.email,
          };
        })
        .concat([
          {
            start: 0,
            end: 1,
            text:
              "TESTING: If we have at least one true negative, kappa results make a lot more sense!!! (working on adding real true negatives to replace this dummy example)",
            label: annotations[0].label,
            annotator: "test@gmail.com",
          },
        ]),
      annotators: selectedAnnotators.value,
      tolerance: tolerance.value,
    }),
  });

  console.log("table:");
  console.log(kappa_result.value);

  loading.value = false;
};

const downloadCSV = async () => {
  const options = {
    fieldSeparator: ",",
    quoteStrings: '"',
    decimalSeparator: ".",
    showLabels: true,
    showTitle: true,
    title: `Task ${task.value?.id}: ${task.value?.name} | Label: ${selectedLabel.value} | ${kappa_result.value.variant}Kappa: ${kappa_result.value.result} | Po: ${kappa_result.value.po} | Pe: ${kappa_result.value.pe} | Tolerance: ${tolerance.value}`,
    useTextFile: false,
    useBom: true,
    useKeysAsHeaders: true,
  };

  const csvExporter = new ExportToCsv(options);

  var rows: any[] = [];
  kappa_result.value.table.forEach((r: any) => {
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

  console.log("options:");
  console.log(annotatorsOptions);
  console.log(labelsOptions);
  console.log(documentsOptions);
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
</style>
