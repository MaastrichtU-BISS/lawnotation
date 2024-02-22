<template>
  <div>
    <h3 class="text-lg font-semibold mb-2">Labelsets</h3>
    <Table
      ref="labelsetTable"
      endpoint="labelsets"
      :sort="true"
      :search="true"
      :selectable="true"
      @remove-rows="removeLabelsets"
    >
      <template #row="{ item }: { item: Labelset }">
        <th scope="row" class="px-6 py-2 font-medium text-gray-900 whitespace-nowrap">
          {{ item.id }}
        </th>
        <td class="px-6 py-2">
          {{ item.name }}
        </td>
        <td class="px-6 py-2">
          {{ item.desc }}
        </td>
        <td class="px-6 py-2">
          <NuxtLink class="base" data-test="edit-labelset" :to="`/labelset/${item.id}`">
            <Button label="View" size="small" />
          </NuxtLink>
        </td>
      </template>
    </Table>
    <div class="my-4">
      <button class="base btn-primary" data-test="create-new-labelset" @click="navigateTo('/labelset/new')">
        Create new labelset
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import Table from "~/components/Table.vue";
import type { Labelset } from "~/types";

const { $trpc, $toast } = useNuxtApp();
const labelsetTable = ref<InstanceType<typeof Table>>();

const removeLabelsets = async (ids: string[]) => {
  const promises: Promise<Boolean>[] = [];
  promises.push(...ids.map((id) => $trpc.labelset.delete.mutate(+id)));
  await Promise.all(promises);
  await labelsetTable.value?.refresh();
  $toast.success("Tasks successfully deleted!");
};
// const removeAllLabelsets = async () => {
//   await $trpc.labelset.deleteAllFr.mutate(project.id);
//   await labelsetTable.value?.refresh();
//   $toast.success("Tasks successfully deleted!");
// };

definePageMeta({
  middleware: ["auth"],
});
</script>
