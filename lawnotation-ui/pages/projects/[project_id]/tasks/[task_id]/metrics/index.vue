<template>
  <div class="my-3 text-center">
    <button class="btn btn-primary" @click="compute_fleiss_kappa">Fleiss Kappa</button>
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
const document = ref<Document>();
const labelset = ref<Labelset>();
const assignments = reactive<Assignment[]>([]);
const loading = ref(false);

const get_annotations = async () => {
  if (!task.value) throw new Error("Invalid Task");
  const annotations = await annotationApi.findAnnotationsByTaskAndDocumentAndLabel(
    task.value?.id.toString(),
    "1488",
    "Omission"
  );
  return annotations;
};

const compute_fleiss_kappa = async () => {
  loading.value = true;

  const annotations = await get_annotations();

  console.log(annotations);

  const data = await $fetch("/api/metrics/fleiss_kappa", {
    method: "POST",
    body: JSON.stringify({ annotations: annotations }),
  });
  console.log(data);
  loading.value = false;
};

onMounted(async () => {
  task.value = await taskApi.findTask(route.params.task_id.toString());
  // assignments.splice(0) &&
  //   assignments.push(
  //     ...(await assignmentApi.findAssignmentsByTask(task.value.id.toString()))
  //   );
});

definePageMeta({
  middleware: ["auth"],
});
</script>
