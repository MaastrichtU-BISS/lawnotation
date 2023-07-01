<template>
  <Breadcrumb v-if="task" :crumbs="[
    {
      name: 'Tasks',
      link: '/tasks',
    },
    {
      name: `Task ${task.name}`,
      link: `/tasks/${task.id}`,
    }
  ]" />
  
  <div v-if="task">
    <div class="max-w-screen-md w-full mx-auto" v-if="assignmentCounts">
      <div class="flex justify-between mb-1">
        <span class="text-base font-medium text-gray-500 text-muted">Assignment</span>
        <span class="text-sm font-medium text-blue-700">{{ assignmentCounts.next - 1}} / {{ assignmentCounts.total }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-500" :style="{'width': `${((assignmentCounts.next - 1 )/ assignmentCounts.total)*100}%`}"></div>
      </div>
    </div>
    <div class="text-center my-10">
      <div v-if="assignmentCounts && assignmentCounts.next <= assignmentCounts.total">
        <NuxtLink :to="`/annotate/${task.id}?seq=${assignmentCounts?.next}`">
          <button class="btn-primary">Annotate Next Assignment</button>
        </NuxtLink>
      </div>
    </div>
    <div class="dimmer-wrapper">
      <Dimmer v-model="assignmentTable.loading" />
      <Dimmer v-model="loading" />
      <Table :tabledata="assignmentTable" :sort="true" :search="true">
        <template #row="{item}: {item: AssignmentTableData}">
          <tr class="bg-white border-b hover:bg-gray-50">
            <th scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
              {{ item.seq_pos }}
            </th>
            <td class="px-6 py-2">
              {{ item.document.name }}
            </td>
            <td class="px-6 py-2">
              <span
                :class="
                  item.status == 'done' ? 'text-green-600' : 'text-orange-700'
                "
                >{{ item.status }}</span
              >
            </td>
            <td class="px-6 py-2">
              <NuxtLink
                class="font-medium text-blue-600 hover:underline"
                :to="`/annotate/${task.id}?seq=${item.seq_pos}`"
                >View</NuxtLink
              >
            </td>
          </tr>
        </template>
      </Table>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Task, useTaskApi } from "~/data/task";
import { Assignment, AssignmentTableData, useAssignmentApi } from "~/data/assignment";
import { User, useUserApi } from "~/data/user";
import { createTableData   } from "~/utils/table";

const config = useRuntimeConfig();
const { $toast } = useNuxtApp();

const user = useSupabaseUser();
const taskApi = useTaskApi();
const assignmentApi = useAssignmentApi();
const userApi = useUserApi();

const route = useRoute();
const task = ref<Task>();
const loading = ref(false);

const assignmentCounts = ref<{ next: number ; total: number }>();

const loadCounters = async () => {
  try {
    if (!user.value) throw new Error("Must be logged in");
    if (!task.value) throw new Error("Invalid task");

    const counts = await assignmentApi.countAssignmentsByUserAndTask(
      user.value.id,
      task.value?.id
    );

    assignmentCounts.value = counts;

  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Problem loading counters: ${error.message}`);
  }
};

const assignmentTable = createTableData<AssignmentTableData>(
  {
    'Order': {
      field: 'seq_pos',
      sort: true,
    },
    'Document': {
      field: 'document.name',
      // sort: true,
      search: true,
    },
    'Status': {
      field: 'status',
      sort: true,
    },
    'Action': {}
  },
  {
    type: 'table',
    from: 'assignments',
    select: 'id, task_id, annotator:users!inner (id, email), document:documents!inner (id, name, source), status, seq_pos',
    filter: () => ({
      task_id: task.value?.id,
      'annotator.id': user.value?.id,
      status: 'done'
    })
  }
);

onMounted(async () => {
  task.value = await taskApi.findTask(route.params.task_id as string);
  await loadCounters()
});

definePageMeta({
  middleware: ["auth"],
});
</script>
