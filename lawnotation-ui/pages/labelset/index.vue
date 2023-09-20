<template>
  <div>
    <h3 class="text-lg font-semibold mb-2">Labelsets</h3>
    <Table
      endpoint="labelsets"
      :columns="{
        'Id': 'id',
        'Name': 'name',
        'Description': 'desc',
        'Action': null
      }"
      :sort="true"
      :search="true">
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
    <div class="my-4">
      <button class="base btn-primary" @click="navigateTo('/labelset/new')">
        Create new labelset
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Labelset } from "~/types";

definePageMeta({
  middleware: ["auth"],
});
</script>
