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
const user = useSupabaseUser();

const labelset = ref({
  editor_id: user.value?.id,
  name: "",
  desc: "",
  labels: [],
});

definePageMeta({
  middleware: ["auth"],
});
</script>
