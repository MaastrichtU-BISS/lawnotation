<template>
  <Breadcrumb
    :crumbs="[
      {
        name: 'Labelsets',
        link: '/labelset',
      },
      {
        name: 'New labelset',
        link: '/labelset/new',
      },
    ]"
  />

  <Labelset v-model="labelset" @labelset-persisted="navigateTo('/labelset')" />
</template>

<script setup lang="ts">
import Labelset from "~/components/Labelset.vue";

const labelset = ref({
  name: "",
  desc: "",
  labels: [],
});

definePageMeta({
  middleware: ["auth"],
});
</script>
