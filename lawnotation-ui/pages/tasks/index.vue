<template>
  <div class="dimmer">
    <Dimmer v-model="taskTable.loading" />
    <div class="dimmer-content">
      <h3 class="my-3 text-lg font-semibold mb-2">Assigned Tasks</h3>
      <Table :tabledata="taskTable" :sort="true" :search="true">
        <template #row="{item}: {item: Task}">
          <tr class="bg-white border-b hover:bg-gray-50">
            <th
              scope="row"
              class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap"
            >
              {{ item.id }}
            </th>
            <td class="px-6 py-2">
              {{ item.name }}
            </td>
            <td class="px-6 py-2">
              <NuxtLink
                class="base"
                :to="`/tasks/${item.id}`"
              >
                View
              </NuxtLink>
            </td>
          </tr>
        </template>
      </Table>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Task } from "~/types";

const user = useSupabaseUser();

const taskTable = createTableData<Task>(
  {
    'Id': {
      field: 'id',
      sort: true,
    },
    'Name': {
      field: 'name',
      sort: true,
      search: true,
    },
    'Action': {}
  },
  {
    type: 'table',
    from: 'tasks',
    select: 'id, name, assignment:assignments!inner(id)',
    filter: () => ({
      'assignment.annotator_id': user.value?.id
    })
  }
);

definePageMeta({
  middleware: ["auth"],
});
</script>
