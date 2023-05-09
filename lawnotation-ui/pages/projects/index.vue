<template>
  <div class="my-4 mx-auto max-w-screen-lg">
    <div class="dimmer-wrapper" style="min-height: 200px">
      <Dimmer v-model="loading" />
      <div class="dimmer-content">
        <h3 class="text-lg font-semibold mb-2">My Projects: {{ projects.length }}</h3>
        <ul v-for="p in projects" :key="p.id" class="list-disc list-inside">
          <li>
            <span
              >{{ p.id }}.
              <NuxtLink :to="`/projects/${p.id}`">{{ p.name }}</NuxtLink></span
            >
          </li>
        </ul>
      </div>
    </div>
    <div class="flex flex-col w-1/2 space-y-2 border-t border-neutral-300 mt-3 pt-3">
      <input type="text" placeholder="Project name" v-model="new_project.name" />
      <textarea placeholder="Project description" v-model="new_project.desc"></textarea>
      <button class="flex-none btn-primary" @click="createNewProject">Add</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Project, useProjectApi } from "~/data/project";
const projectApi = useProjectApi();
const user = useSupabaseUser();
const { $toast } = useNuxtApp();

const projects = reactive<Project[]>([]);
const loading = ref(true);

const new_project = reactive<Omit<Project, "id">>({
  name: "",
  desc: "",
  editor_id: "",
});

onMounted(() => {
  if (user.value) loadProjects();
  else {
    watch(user, () => {
      if (user.value) {
        loadProjects();
      }
    });
  }
});

const loadProjects = () => {
  try {
    loading.value = true;
    projectApi
      .findProjects(user.value!.id.toString())
      .then((_projects) => {
        projects.splice(0) && projects.push(..._projects);
        loading.value = false;
      })
      .catch((error) => {
        loading.value = false;
      });
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error loading projects: ${error.message}`);
  }
};

const createNewProject = () => {
  try {
    new_project.editor_id = user.value?.id;
    projectApi.createProject(new_project).then((project) => {
      projects.push(project);
      $toast.success("Project created");
    });
  } catch (error) {
    if (error instanceof Error)
      $toast.error(`Error creating new projec: ${error.message}`);
  }
};

definePageMeta({
  middleware: ["auth"],
});
</script>
