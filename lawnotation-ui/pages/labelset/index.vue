<template>
  <div>
    <h3 class="text-lg font-semibold mb-2">Labelsets</h3>
    <Table endpoint="labelsets" :sort="true" :search="true">
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
          <NuxtLink class="base" :to="`/labelset/${item.id}`"> View </NuxtLink>
        </td>
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
import type { Labelset } from "~/types";

definePageMeta({
  middleware: ["auth"],
});
</script>
