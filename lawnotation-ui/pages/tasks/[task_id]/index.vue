<template>
  <div v-if="task">
    <h3 class="my-3 text-lg font-semibold">Task: {{ task.name }}</h3>
    <div class="text-center my-10">
      <NuxtLink :to="`/annotate/${task.id}`">
        <button class="btn-primary">Annotate Next Assignment</button>
      </NuxtLink>
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

onMounted(() => {
  taskApi.findTask(route.params.task_id.toString()).then((_task) => {
    task.value = _task;
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
