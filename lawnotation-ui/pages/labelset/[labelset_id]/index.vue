<template>
  <div v-if="labelset">
    Content
  </div>
</template>
<script setup lang="ts">
import { Labelset, useLabelsetApi } from "~/data/labelset";
const route = useRoute();

const user = useSupabaseUser();
const labelsetApi = useLabelsetApi();

const labelset = ref<Labelset>();

onMounted(() => {
  labelsetApi.findLabelset(route.params.labelset_id.toString()).then((_labelset) => {
    labelset.value = _labelset;
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
