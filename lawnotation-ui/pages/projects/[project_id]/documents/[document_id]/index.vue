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
    <h2 class="text-center text-lg mb-3 font-bold">{{ document?.name }}</h2>
    <p>{{ document?.full_text }}</p>
  </div>
</template>
<script setup lang="ts">
import type { Project, Document } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";

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
  middleware: ["auth",
    async (to) => authorizeClient([["document", +to.params.document_id]]),
    async (to) => authorizeClient([["project", +to.params.project_id]])],
});
</script>
