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
    <div class="flex items-center mx-auto w-1/2" v-if="totalCount">
        <span class="font-semibold mr-2">{{ previousCount }}/{{ totalCount }}</span>
        <span class="w-full">
          <ProgressBar :value="Math.round((previousCount / totalCount) * 100)"> {{ Math.round(previousCount / totalCount * 100)}}% </ProgressBar>
        </span>
    </div>
    <div class="text-center my-10">
      <div v-if="nextAssignment && totalCount <= totalCount">
        <NuxtLink :to="`/annotate/${task.id}?seq=${nextAssignment.seq_pos}`">
          <button class="base btn-primary" data-test="annotate-next-assignment-button">Annotate Next Assignment</button>
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
          <Badge :value="item.status" :severity="item.status == 'done' ? 'success' : 'danger'" class="capitalize px-2" />
        </td>
        <td class="px-6 py-2">
          <span>{{ item.difficulty_rating }}</span>
        </td>
        <td class="px-6 py-2 flex">
          <NuxtLink :to="`/annotate/${task.id}?seq=${item.seq_pos}`">
            <Button label="View" size="small" />
          </NuxtLink>
        </td>
      </template>
    </Table>
  </div>
</template>
<script setup lang="ts">
import type { AssignmentTableData } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";

const { $toast, $trpc } = useNuxtApp();

const user = useSupabaseUser();

const route = useRoute();
const task = await $trpc.task.findById.query(+route.params.task_id);

const nextAssignment = await $trpc.assignment.findNextAssignmentsByUserAndTask.query({ annotator_id: user.value?.id!, task_id: task.id });

const previousCount = ref<number>(0);
const totalCount = ref<number>(0);

const loadCounters = async () => {
  try {
    if (!user.value) throw new Error("Must be logged in");
    if (!task) throw new Error("Invalid task");

    const counts = await $trpc.assignment.countAssignmentsByUserAndTask.query({
      annotator_id: user.value.id,
      task_id: task.id
    });

    previousCount.value = counts.previous;
    totalCount.value = counts.total;
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Problem loading counters: ${error.message}`);
  }
};

onMounted(async () => {
  await loadCounters();
});

definePageMeta({
  middleware: ["auth", async (to) => authorizeClient([["task", +to.params.task_id]])],
});
</script>
