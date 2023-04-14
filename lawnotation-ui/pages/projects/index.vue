<template>
  <div class="my-4 mx-auto max-w-screen-lg">
    <div v-if="projects_loading">
      <span>Loading projects...</span>
    </div>
    <template v-else>
      <h3 class="text-lg font-semibold mb-2">My Projects: {{ projects.length }}</h3>
      <ul v-for="p in projects" :key="p.id" class="list-disc list-inside">
        <li>
          <span
            >{{ p.id }}. <NuxtLink :to="`/projects/${p.id}`">{{ p.name }}</NuxtLink></span
          >
        </li>
      </ul>
    </template>
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

const projects = reactive<Project[]>([]);
const projects_loading = ref(true);

const new_project = reactive({
  name: "",
  desc: "",
  user_id: user?.value?.id,
});

onMounted(() => {
  loadProjects();
});

const loadProjects = () => {
  projects_loading.value = true;
  projectApi.findProjects(user?.value?.id).then((_projects) => {
    projects.splice(0) && projects.push(..._projects);
    projects_loading.value = false;
  });
};

const createNewProject = () => {
  projectApi.createProject(new_project).then((project) => {
    projects.push(project);
  });
};

definePageMeta({
  middleware: ["auth"],
});
</script>
