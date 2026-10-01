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
    <template v-if="document">
      <h2 class="text-center text-lg mb-3 font-bold">{{ document.name }}</h2>
      <div class="p-2 whitespace-pre-wrap">{{ text }}</div>
    </template>
  </div>
</template>
<script setup lang="ts">
import type { Project, Document } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";
import { legacyHtmlToText } from "~/utils/annotator";
import { isLegacyHtml } from "~/utils/levels";
import Breadcrumb from "~/components/Breadcrumb.vue";

const { $trpc } = useNuxtApp();

const route = useRoute();
const document = ref<Document>();
const project = ref<Project>();

// Shown as the text that gets annotated. A document uploaded as HTML before
// parsing moved to the server is still markup; it is shown as the text its
// annotations count, never rendered.
const text = computed(() => {
  const d = document.value;
  if (!d) return "";
  return isLegacyHtml(d.name, d.full_text) ? legacyHtmlToText(d.full_text) : d.full_text;
});

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
