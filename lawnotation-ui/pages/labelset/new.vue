<template>
  <Breadcrumb :crumbs="crumbs" />
  <Labelset v-model="labelset" @labelset-persisted="navigateTo('/labelset')" />
</template>

<script setup lang="ts">
import Breadcrumb from "~/components/Breadcrumb.vue";
import Labelset from "~/components/labels/Labelset.vue";
const user = useSupabaseUser();

const labelset = ref({
  editor_id: user.value?.id,
  name: "",
  desc: "",
  labels: [],
});

const crumbs = computed(() => [
  {
    name: "Labelsets",
    link: "/labelset",
  },
  {
    name: "New labelset",
    link: "/labelset/new",
  },
]);

definePageMeta({
  middleware: ["auth"],
});
</script>
