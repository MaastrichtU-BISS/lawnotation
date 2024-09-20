<template>
  <Labelsets
    base-route="/labelset"
  />
</template>

<script setup lang="ts">
import Labelsets from "~/components/labels/Labelsets.vue";

definePageMeta({
  middleware: ["auth"],
});
</script>
