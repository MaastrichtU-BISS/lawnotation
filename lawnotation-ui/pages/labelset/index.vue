<template>
  <Labelsets
    base-route="/labelset"
  />
  <ReportProblem/>
</template>

<script setup lang="ts">
import Labelsets from "~/components/labels/Labelsets.vue";
import ReportProblem from "~/components/ReportProblem.vue";

definePageMeta({
  middleware: ["auth"],
});
</script>
