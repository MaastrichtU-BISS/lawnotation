<template>
  <Breadcrumb
    v-if="labelset"
    :crumbs="[
      {
        name: 'Labelsets',
        link: '/labelset',
      },
      {
        name: `Labelset ${labelset.name}`,
        link: `/labelset/${labelset.id}`,
      },
    ]"
  />

  <div v-if="labelset === undefined">Loading labelset...</div>
  <div v-else>
    <Labelset v-model="labelset" @labelset-persisted="navigateTo('/labelset')" />
  </div>
</template>

<script setup lang="ts">
import type { Labelset as LabelsetType } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";
import Labelset from "~/components/labels/Labelset.vue";

const route = useRoute();
const { $trpc } = useNuxtApp();

const labelset = ref<LabelsetType>();

onMounted(async () => {
  labelset.value = await $trpc.labelset.findById.query(+route.params.labelset_id);
});

definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([["labelset", +to.params.labelset_id]]),
  ],
});
</script>
