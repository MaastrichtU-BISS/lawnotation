<template>
  <div>
    <h3 class="my-3 text-lg font-semibold mb-2">Assigned Tasks</h3>
    <Table endpoint="assignedTasks" :sort="true" :search="true">
      <template #row="{ item }: { item: Task }">
        <th scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
          {{ item.id }}
        </th>
        <td class="px-6 py-2">
          {{ item.name }}
        </td>
        <td class="px-6 py-2">
          <NuxtLink :to="`/tasks/${item.id}`" data-test="view-task-link">
            <Button label="View" size="small" />
          </NuxtLink>
        </td>
      </template>
    </Table>
  </div>
</template>
<script setup lang="ts">
import type { Task } from "~/types";

const user = useSupabaseUser();

definePageMeta({
  middleware: ["auth"],
});
</script>
