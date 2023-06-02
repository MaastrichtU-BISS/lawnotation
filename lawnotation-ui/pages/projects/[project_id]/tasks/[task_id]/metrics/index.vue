<template>
  <div class="my-3 text-center">
    <button class="btn btn-primary" @click="compute_fleiss_kappa">Fleiss Kappa</button>
  </div>
</template>
<script setup lang="ts">
import { Task, useTaskApi } from "~/data/task";
import { Assignment, AssignmentTableData, useAssignmentApi } from "~/data/assignment";

const config = useRuntimeConfig();
const { $toast } = useNuxtApp();

const user = useSupabaseUser();
const taskApi = useTaskApi();
const assignmentApi = useAssignmentApi();

const route = useRoute();
const task = ref<Task>();
const assignments = reactive<Assignment[]>([]);
const loading = ref(false);

const get_options = () => {
  return {
    method: "POST",
    body: JSON.stringify(assignments),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

const compute_fleiss_kappa = () => {
  loading.value = true;
  fetch("/api/fleiss_kappa", get_options())
    .then((res) => {
      console.log(res);
      console.log(res.text());
      // console.log(res.json());
      return res.text();
    })
    .then((res) => {
      console.log(res);
      loading.value = false;
    })
    .catch((error) => {
      console.log(error);
      loading.value = false;
    });
};

onMounted(async () => {
  task.value = await taskApi.findTask(route.params.task_id.toString());
  assignments.splice(0) &&
    assignments.push(
      ...(await assignmentApi.findAssignmentsByTask(task.value.id.toString()))
    );
});

definePageMeta({
  middleware: ["auth"],
});
</script>
