<template>
  <div>
    <h3 class="text-lg font-semibold mb-2">Labelsets</h3>
    <ul class="list-disc list-inside" v-if="false">
      <li v-for="labelset of labelsets">
        <span
          >{{ labelset.id }}.
          <NuxtLink :to="`/labelset/${labelset.id}`">{{ labelset.name }}</NuxtLink></span
        >
      </li>
    </ul>

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
                  class="font-medium text-blue-600 hover:underline"
                  :to="`/labelset/${item.id}`"
                  >View</NuxtLink
                >
              </td>
            </tr>
          </template>
        </Table>
      </div>
    </div>
    
    <div class="my-4">
      <button class="btn-primary" @click="navigateTo('/labelset/new')">
        Create new labelset
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Labelset } from "~/data/labelset";

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
