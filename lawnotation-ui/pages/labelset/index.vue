<template>
  <div v-if="labelsets">
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

const labelsets = reactive<Labelset[]>([]);

onMounted(() => {
  labelsetApi.findLabelsets().then((_labelsets) => {
    labelsets.push(..._labelsets)
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
