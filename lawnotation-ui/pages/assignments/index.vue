<template>
  <div class="my-4 mx-auto max-w-screen-lg">
    <div v-if="assignments_loading">
      {{ user }}
      <span>Loading assignments...</span>
    </div>
    <template v-else>
      <h3 class="text-lg font-semibold mb-2">My assignments: {{ assignments.length }}</h3>
      <ul v-for="a in assignments" :key="a.id" class="list-disc list-inside">
        <li>
          <NuxtLink :to="`/assignments/${a.id}`">{{ a.id }}</NuxtLink>
        </li>
      </ul>
    </template>
  </div>
</template>
<script setup lang="ts">
import { Assignment, useAssignmentApi } from "~/data/assignment";
const assignmentApi = useAssignmentApi();
const user = useSupabaseUser();
const assignments = reactive<Assignment[]>([]);
const assignments_loading = ref(true);

onMounted(() => {
  loadAssignments();
});

const loadAssignments = () => {
  assignments_loading.value = true;

  assignmentApi
    .findAssignmentsByUser(user?.value.id)
    .then((_assignments) => {
      console.log(_assignments);
      assignments.splice(0) && assignments.push(..._assignments);
      assignments_loading.value = false;
    })
    .catch((error) => {
      assignments_loading.value = false;
    });
};

definePageMeta({
  middleware: ["auth"],
});
</script>
