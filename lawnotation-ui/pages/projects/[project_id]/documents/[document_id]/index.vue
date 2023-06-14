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
import { Project, useProjectApi } from "~/data/project";
import { Document, useDocumentApi } from "~/data/document";
const documentApi = useDocumentApi();
const projectApi = useProjectApi();

const route = useRoute();
const document = ref<Document>();
const project = ref<Project>();

onMounted(async () => {
  documentApi.findDocument(route.params.document_id.toString()).then((d) => {
    document.value = d;
  });

  project.value = await projectApi.findProject(route.params.project_id as string);
});

definePageMeta({
  middleware: ["auth"],
});
</script>
