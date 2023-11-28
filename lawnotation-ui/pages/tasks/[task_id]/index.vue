<template>
  <Breadcrumb v-if="task" :crumbs="[
    {
      name: 'Tasks',
      link: '/tasks',
    },
    {
      name: `Task ${task.name}`,
      link: `/tasks/${task.id}`,
    },
  ]" />

  <div v-if="task">
    <div class="max-w-screen-md w-full mx-auto" v-if="assignmentCounts">
      <div class="flex justify-between mb-1">
        <span class="text-base font-medium text-gray-500 text-muted">Assignment</span>
        <span class="text-sm font-medium text-blue-700">{{ assignmentCounts.next - 1 }} / {{ assignmentCounts.total
        }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-500" :style="{
            width: `${((assignmentCounts.next - 1) / assignmentCounts.total) * 100}%`,
          }"></div>
      </div>
    </div>
    <div class="text-center my-10">
      <div v-if="assignmentCounts && assignmentCounts.next <= assignmentCounts.total">
        <NuxtLink :to="`/annotate/${task.id}?seq=${assignmentCounts?.next}`">
          <button class="base btn-primary">Annotate Next Assignment</button>
        </NuxtLink>
      </div>
    </div>
    <Table endpoint="assignedAssignments" :filter="{ task_id: task.id }" :sort="true" :search="true">
      <template #row="{ item }: { item: AssignmentTableData }">
        <th scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
          {{ item.seq_pos }}
        </th>
        <td class="px-6 py-2">
          {{ item.document.name }}
        </td>
        <td class="px-6 py-2">
          <span :class="item.status == 'done' ? 'text-green-600' : 'text-orange-700'">{{
            item.status
          }}</span>
        </td>
        <td class="px-6 py-2">
          <span>{{ item.difficulty_rating }}</span>
        </td>
        <td class="px-6 py-2">
          <NuxtLink class="base" :to="`/annotate/${task.id}?seq=${item.seq_pos}`">
            View
          </NuxtLink>
        </td>
      </template>
    </Table>
  </div>
</template>
<script setup lang="ts">
import type { Task, AssignmentTableData } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();

const route = useRoute();
const task = await $trpc.task.findById.query(+route.params.task_id);

const assignmentCounts = ref<{ next: number; total: number }>();

const loadCounters = async () => {
  try {
    if (!user.value) throw new Error("Must be logged in");
    if (!task) throw new Error("Invalid task");

    const counts = await $trpc.assignment.countAssignmentsByUserAndTask.query({
      annotator_id: user.value.id,
      task_id: task.id,
    });

    assignmentCounts.value = counts;
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Problem loading counters: ${error.message}`);
  }
};

onMounted(async () => {
  // task.value = await $trpc.task.findById.query(+route.params.task_id);
  if (!task)
    await loadCounters();
});

definePageMeta({
  middleware: ["auth", async (to) => authorizeClient([["task", +to.params.task_id]])],
});
</script>
