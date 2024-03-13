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

  <CreateLabelset />
</template>

<script setup lang="ts">
import CreateLabelset from "~/components/CreateLabelset.vue";

definePageMeta({
  middleware: ["auth"],
});
</script>
