<template>
  <div v-if="task">
    <h3 class="my-3 text-lg font-semibold">Task: {{ task.name }}</h3>
    <div class="dimmer-wrapper">
      <Dimmer v-model="assignmentTable.loading" />
      <Dimmer v-model="loading" />
      <div class="text-center my-10">
        <NuxtLink :to="`/annotate/${task.id}`"
          ><button class="btn-primary">Annotate Next Assignment</button></NuxtLink
        >
      </div>
      <Table :tabledata="assignmentTable">
        <template #head>
          <tr>
            <th
              scope="col"
              class="px-6 py-3"
              v-for="colname in ['Order', 'Document', 'Status', 'Action']"
            >
              {{ colname }}
            </th>
          </tr>
        </template>
        <template #body>
          <tr
            class="bg-white border-b hover:bg-gray-50"
            v-for="assignment in assignmentTable.rows"
            :key="assignment.id"
          >
            <th scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
              {{ assignment.seq_pos }}
            </th>
            <td class="px-6 py-2">
              {{ assignment.document.name }}
            </td>
            <td class="px-6 py-2">
              <span
                :class="
                  assignment.status == 'done' ? 'text-green-600' : 'text-orange-700'
                "
                >{{ assignment.status }}</span
              >
            </td>
            <td class="px-6 py-2">
              <NuxtLink
                class="font-medium text-blue-600 hover:underline"
                :to="`/annotate/${task.id}?seq=${assignment.seq_pos}`"
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
import { TableData } from "~/components/Table.vue";

const config = useRuntimeConfig();
const { $toast } = useNuxtApp();

const user = useSupabaseUser();
const taskApi = useTaskApi();
const assignmentApi = useAssignmentApi();
const userApi = useUserApi();

const route = useRoute();
const task = ref<Task>();
const loading = ref(false);

const assignmentTable = reactive<TableData<AssignmentTableData>>({
  total: 0,
  rows: [],

  page: 1,
  items_per_page: 10,
  loading: false,

  async load() {
    if (!task.value) return;
    if (!user.value) return;

    this.loading = true;

    try {
      const { rows, count } = await assignmentApi.tableAssignmentsByTaskAndUser(
        task.value.id,
        user.value.id,
        (this.page - 1) * this.items_per_page,
        this.items_per_page
      );

      if (rows) this.rows = rows;
      if (count) this.total = count;
    } catch (error) {}
    this.loading = false;
  },
});

onMounted(() => {
  taskApi.findTask(route.params.task_id.toString()).then((_task) => {
    task.value = _task;
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
