<template>
  <div class="my-3">
    <div v-if="documents.length" class="my-4">
      <label for="label_id">Document</label>
      <div class="flex w-full space-x-2">
        <select
          v-if="documents.length"
          v-model="document"
          class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-2.5 py-1.5"
        >
          <option v-for="doc of documents" :value="doc.id">
            <span class="mr-3">{{ doc.id }} - </span>{{ doc.name }}
          </option>
        </select>
        <span v-else>No documents found</span>
      </div>
    </div>
    <div v-if="labels.length" class="my-4">
      <label for="label_id">Label</label>
      <div class="flex w-full space-x-2">
        <select
          v-if="labels.length"
          v-model="label"
          class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 px-2.5 py-1.5"
        >
          <option :value="'All'" selected>All</option>
          <option v-for="l of labels" :value="l.name">
            {{ l.name }}
          </option>
        </select>
        <span v-else>No labels found</span>
      </div>
    </div>
    <button class="btn btn-primary" @click="compute_fleiss_kappa">Fleiss Kappa</button>
    <div v-if="fleiss_kappa_result">
      <h5 class="text-lg font-semibold">Result: {{ fleiss_kappa_result.result }}</h5>
      <div>P0: {{ fleiss_kappa_result.p0 }}</div>
      <div>Pe: {{ fleiss_kappa_result.pe }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Task, useTaskApi } from "~/data/task";
import { Assignment, useAssignmentApi } from "~/data/assignment";
import { Annotation, useAnnotationApi } from "~/data/annotation";
import { Document, useDocumentApi } from "~/data/document";
import { Labelset, useLabelsetApi } from "~/data/labelset";

const config = useRuntimeConfig();
const { $toast } = useNuxtApp();

// const user = useSupabaseUser();
const taskApi = useTaskApi();
const assignmentApi = useAssignmentApi();
const annotationApi = useAnnotationApi();
const documentApi = useDocumentApi();
const labelsetApi = useLabelsetApi();

const route = useRoute();
const task = ref<Task>();
const documents = reactive<Document[]>([]);
const document = ref<string>();
const labels = reactive<{ name: string; color: string }[]>([]);
const label = ref<string>("All");
const loading = ref(false);

const fleiss_kappa_result = ref();

const get_annotations = async () => {
  if (!task.value) throw new Error("Invalid Task");
  if (!document.value) throw new Error("Document Task");

  const annotations = await annotationApi.findAnnotationsByTaskAndDocumentAndLabel(
    task.value?.id.toString(),
    document.value,
    label.value != "All" ? label.value : null
  );
  return annotations;
};

const compute_fleiss_kappa = async () => {
  loading.value = true;

  const annotations = await get_annotations();

  console.log(annotations);

  var annotators_set = new Set<string>();

  annotations.map((ann) => {
    annotators_set.add((ann as any).assignment.annotator.email);
  });

  fleiss_kappa_result.value = await $fetch("/api/metrics/fleiss_kappa", {
    method: "POST",
    body: JSON.stringify({
      annotations: annotations.map((a) => {
        return {
          start: a.start_index,
          end: a.end_index,
          label: a.label,
          annotator: (a as any).assignment.annotator.email,
        };
      }),
      labels: labels.map((l) => l.name),
      annotators: Array.from(annotators_set.values()),
    }),
  });

  console.log(fleiss_kappa_result.value);

  loading.value = false;
};

onMounted(async () => {
  task.value = await taskApi.findTask(route.params.task_id.toString());

  labels.splice(0) &&
    labels.push(
      ...(await labelsetApi.findLabelset(task.value.labelset_id.toString())).labels
    );

  documents.splice(0) &&
    documents.push(
      ...(await documentApi.findSharedDocumentsByTask(task.value.id.toString()))
    );

  document.value = documents[0].id.toString();
});

definePageMeta({
  middleware: ["auth"],
});
</script>
