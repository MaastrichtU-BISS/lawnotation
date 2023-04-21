<template>
  <div v-if="labelsets">
    <ul>
      <li v-for="labelset of labelsets">{{ labelset.name }}</li>
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
  labelsetApi.findLabelsets(route.params.labelset_id.toString()).then((_labelsets) => {
    labelsets.push(..._labelsets)
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
