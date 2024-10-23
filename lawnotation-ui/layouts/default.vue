<template>
  <div>
    <Header></Header>
    <div id="breadcrumb-holder" class="bg-white dark:bg-gray-800"></div>
  </div>
  <div class="mx-auto max-w-screen-lg py-2">
    <slot />
    <ReportProblem />
  </div>
</template>

<script setup lang="ts">
import ReportProblem from "~/components/ReportProblem.vue";
</script>