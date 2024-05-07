<template>
  <div>
    <div class="flex justify-between pt-2">
      <h3 class="mb-2 text-lg font-semibold">Labelsets</h3>
      <NuxtLink v-if="baseRoute" :to="`${baseRoute}/new`">
        <Button
          label="Add"
          icon="pi pi-plus"
          icon-pos="right"
          data-test="create-new-labelset"
        />
      </NuxtLink>
      <Button
        v-else
        label="Add"
        icon="pi pi-plus"
        icon-pos="right"
        @click="$emit('addLabelset')"
        data-test="create-new-labelset"
      />
    </div>
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
        <td class="px-6 py-2 flex">
          <NuxtLink v-if="baseRoute" :to="`${baseRoute}/${item.id}`">
            <Button label="View" size="small" data-test="edit-labelset"
          /></NuxtLink>
          <Button
            v-else
            label="View"
            size="small"
            @click="$emit('editLabelset', item.id)"
            data-test="edit-labelset"
          />
        </td>
      </template>
    </Table>
  </div>
</template>

<script setup lang="ts">
import Table from "~/components/Table.vue";
import type { Labelset } from "~/types";

const { $trpc } = useNuxtApp();
const labelsetTable = ref<InstanceType<typeof Table>>();

const { baseRoute } = defineProps<{ baseRoute?: string }>();

const removeLabelsets = async (
  ids: string[],
  finish: (promises: Promise<Boolean>[]) => void
) => {
  finish([...ids.map((id) => $trpc.labelset.delete.mutate(+id))]);
};
</script>
