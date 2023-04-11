<template>
  <div class="my-4 mx-auto max-w-screen-lg">
    <h3 class="text-lg font-semibold mb-2">My Projects: {{ projects.length }}</h3>
    <ul v-for="p in projects" :key="p.id" class="list-disc list-inside">
      <li>
        <span>{{ p.id }}. <NuxtLink :to="`/projects/${p.id}`">{{ p.name }}</NuxtLink></span>
      </li>
    </ul>

    <div class="flex flex-col w-1/2 space-y-2  border-t border-neutral-300 mt-3 pt-3">
      <input type="text" placeholder="Project name" v-model="new_project.name" />
      <textarea placeholder="Project description" v-model="new_project.desc"></textarea>
      <button class="flex-none btn-primary" @click="add_new_project">Add</button>
    </div>

  </div>
</template>
<script setup lang="ts">
import { Project, useProjectApi } from "~/data/project";
const projectApi = useProjectApi();
const projects = reactive<Project[]>([]);

const new_project = reactive({
  name: '',
  desc: '',
});

onMounted(() => {
  projectApi.findProjects().then(_projects => projects.splice(0) && projects.push(..._projects))
});

const add_new_project = () => {
  projectApi.createProject(new_project)
}
</script>
