<template>
  <Breadcrumb v-if="project && document" :crumbs="[
    {
      name: 'Projects',
      link: '/projects',
    },
    {
      name: `Project ${project.name}`,
      link: `/projects/${project.id}`,
    },
    {
      name: `Document ${document.name}`,
      link: `/projects/${project.id}/documents/${document.id}`,
    },
  ]" />

  <div>
    <h3 class="text-lg font-semibold mb-2">Document:</h3>
    <pre>{{ document }}</pre>
  </div>
</template>
<script setup lang="ts">
import { Project, Document } from "~/types";

const { $trpc } = useNuxtApp();

const route = useRoute();
const document = ref<Document>();
const project = ref<Project>();

onMounted(async () => {
  $trpc.document.findById.query(+route.params.document_id).then((d) => {
    document.value = d;
  });

  project.value = await $trpc.project.findById.query(+route.params.project_id);
});

definePageMeta({
  middleware: ["auth"],
});
</script>
