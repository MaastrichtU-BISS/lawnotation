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
      <!-- <div v-if="getDocFormat(document.name!) == 'html'" class="p-2">
        <iframe :srcdoc="document.full_text" sandbox="" class="w-full min-h-[500px]"></iframe>
      </div> -->
      <div v-if="getDocFormat(document.name!) == 'html'" class="p-2" v-html="document.full_text"></div>
      <div v-else class="p-2 whitespace-pre-wrap">{{ document.full_text }}</div>
    </template>
  </div>
</template>
<script setup lang="ts">
import type { Project, Document } from "~/types";
import { authorizeClient } from "~/utils/authorize.client";
import { getDocFormat } from "~/utils/levels";

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
<style>
@import url('../../../../../node_modules/@heartexlabs/label-studio/build/static/css/main.css');
</style>
