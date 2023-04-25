<template>
  <div v-if="labelsets === undefined">Loading labelsets...</div>
  <div v-else>
    <h3 class="text-lg font-semibold mb-2">Available labelsets: {{ labelsets.length }}</h3>
    <ul class="list-disc list-inside">
      <li v-for="labelset of labelsets">
        <span
          >{{ labelset.id }}. <NuxtLink :to="`/labelset/${labelset.id}`">{{ labelset.name }}</NuxtLink></span
        >
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { Labelset, useLabelsetApi } from "~/data/labelset";
const route = useRoute();

const user = useSupabaseUser();
const labelsetApi = useLabelsetApi();

const labelsets = ref<Labelset[]>();

onMounted(() => {
  labelsetApi.findLabelsets().then((_labelsets) => {
    labelsets.value = [];
    labelsets.value.push(..._labelsets)
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
