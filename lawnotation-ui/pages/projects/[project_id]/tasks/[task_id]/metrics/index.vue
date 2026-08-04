<template>
  <div v-if="task && project">
    <Breadcrumb :crumbs="[
      {
        name: 'Projects',
        link: '/projects',
      },
      {
        name: `Project ${project.name}`,
        link: `/projects/${project.id}`,
      },
      {
        name: `Task ${task.name}`,
        link: `/projects/${project.id}/tasks/${task.id}`,
      },
      {
        name: `Metrics`,
        link: `/projects/${project.id}/tasks/${task.id}/metrics`,
      },
    ]" />
    <MetricsPage
      class="metrics-page"
      :source="metricsSource!"
      :report-filename="`${task.name}.zip`"
      @error="(message: string) => $toast.error(message)"
      @open-document="onOpenDocument"
    />
  </div>
  <Dimmer v-else :model-value="true" />
</template>
<script setup lang="ts">
import Breadcrumb from "~/components/Breadcrumb.vue";
import Dimmer from "~/components/Dimmer.vue";
import { MetricsPage } from "vue-iaa-metrics";
import "vue-iaa-metrics/style.css";
import type { Task, Project } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";
import { createMetricsSource } from "~/utils/metricsSource";

const { $toast, $trpc } = useNuxtApp();

const route = useRoute();
const task = ref<Task>();
const project = ref<Project>();

// Everything metrics-specific (filter options, annotations, IAA compute)
// flows through this - see utils/metricsSource.ts.
const metricsSource = computed(() => (task.value ? createMetricsSource(task.value.id) : undefined));

const onOpenDocument = (doc: { id: string; name: string }) => {
  navigateTo(`/projects/${project.value!.id}/tasks/${task.value!.id}/documents/${doc.id}`);
};

onMounted(async () => {
  task.value = await $trpc.task.findById.query(+route.params.task_id);
  project.value = await $trpc.project.findById.query(+route.params.project_id);
});

definePageMeta({
  middleware: ["auth",
    async (to) => authorizeClient([["task", +to.params.task_id]]),
    async (to) => authorizeClient([["project", +to.params.project_id]])],
  layout: "wide",
});
</script>
<style scoped>
.metrics-page {
  height: calc(100vh - 141px);
}
</style>
