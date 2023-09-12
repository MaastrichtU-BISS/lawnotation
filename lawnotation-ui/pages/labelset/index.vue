<template>
  <div>
    <h3 class="text-lg font-semibold mb-2">Labelsets</h3>

    <div class="dimmer-wrapper">
      <Dimmer v-model="labelsetTable.loading" />
      <div class="dimmer-content">
        <Table :tabledata="labelsetTable" :sort="true" :search="true">
          <template #row="{item}: {item: Labelset}">
            <tr class="bg-white border-b hover:bg-gray-50">
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
                <NuxtLink
                  class="base"
                  :to="`/labelset/${item.id}`"
                >
                  View
                </NuxtLink>
              </td>
            </tr>
          </template>
        </Table>
      </div>
    </div>
    
    <div class="my-4">
      <button class="base btn-primary" @click="navigateTo('/labelset/new')">
        Create new labelset
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Labelset } from "~/types";

const user = useSupabaseUser();

const labelsetTable = createTableData<Labelset>(
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
    'Description': {
      field: 'desc',
      // sort: true,
      search: true,
    },
    'Action': {}
  },
  {
    type: 'table',
    from: 'labelsets',
    filter: () => ({ editor_id: user.value?.id })
  }
);

definePageMeta({
  middleware: ["auth"],
});
</script>
