<template>
  <Breadcrumb :crumbs="crumbs" />

  <div v-if="labelset === undefined">Loading labelset...</div>
  <div v-else>
    <Labelset
      v-model="labelset"
      @labelset-persisted="navigateTo('/labelset')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import type { Labelset as LabelsetType } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";
import Breadcrumb from "~/components/Breadcrumb.vue";
import Labelset from "~/components/labels/Labelset.vue";

const route = useRoute();
const { $trpc } = useNuxtApp();

const labelset = ref<LabelsetType>();

const crumbs = computed(() => {
  const result = !labelset.value
    ? [
        {
          name: "Labelsets",
          link: "/labelset",
        },
      ]
    : [
        {
          name: "Labelsets",
          link: "/labelset",
        },
        {
          name: `Labelset ${labelset.value.name}`,
          link: `/labelset/${labelset.value.id}`,
        },
      ];
  console.log("crumbs:", result); // Debug log
  return result;
});

onMounted(async () => {
  labelset.value = await $trpc.labelset.findById.query(
    +route.params.labelset_id,
  );
});

definePageMeta({
  middleware: [
    "auth",
    async (to) => authorizeClient([["labelset", +to.params.labelset_id]]),
  ],
});
</script>
