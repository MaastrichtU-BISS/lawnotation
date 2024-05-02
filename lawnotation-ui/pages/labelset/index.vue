<template>
  <Labelsets
    base-route="/labelset"
  />
</template>

<script setup lang="ts">
import Labelsets from "~/components/Labelsets.vue";

definePageMeta({
  middleware: ["auth"],
});
</script>
