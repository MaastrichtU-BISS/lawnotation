<template>
  <div v-if="project">
    <h3 class="my-2 text-lg font-semibold mb-2">Project</h3>
    <div>{{ project }}</div>
    <h3 class="my-2">Documents: {{ documents.length }}</h3>
    <ul v-for="d in documents" :key="d.id" class="list-disc list-inside">
      <li>
        <span
          >{{ d.id }}.
          <NuxtLink :to="`/projects/${route.params.project_id}/documents/${d.id}`">{{
            d.name
          }}</NuxtLink></span
        >
      </li>
    </ul>
    <div class="my-3">
      <span class="mr-3"> Add Docs</span>
      <input
        type="file"
        name="data-set"
        id=""
        accept=".txt"
        multiple
        @change="change_file($event)"
      />
    </div>
    <span>Go to: </span><NuxtLink :to="`/projects/${project.id}/tasks`">Tasks</NuxtLink>
  </div>
</template>
<script setup lang="ts">
import { Project, useProjectApi } from "~/data/project";
import { Document, useDocumentApi } from "~/data/document";
const supabase = useSupabaseClient();
const projectApi = useProjectApi();
const documentApi = useDocumentApi();

const route = useRoute();
const project = ref<Project>();
const documents = reactive<Document[]>([]);

const change_file = (event: Event) => {
  Array.from(event.target.files).forEach((file: File) => {
    var reader = new FileReader();
    reader.onload = () => {
      documentApi
        .createDocument({
          name: file.name,
          source: "local_upload",
          full_text: reader.result?.toString(),
          project_id: route.params.project_id,
        })
        .then((doc) => {
          documents.push(doc);
        });
    };
    reader.readAsText(file);
  });
};

onMounted(() => {
  projectApi.findProject(route.params.project_id.toString()).then((p) => {
    project.value = p;
    documentApi.findDocuments(p.id.toString()).then((docs) => {
      documents.splice(0) && documents.push(...docs);
    });
  });
});

definePageMeta({
  middleware: ["auth"],
});
</script>
