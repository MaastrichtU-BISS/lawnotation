<template>
  <div>
    <h3>Projects</h3>
    <div v-for="p in projects" :key="p.id">
      <NuxtLink :to="`/projects/${p.id}`">{{ p.id + ":" + p.name }}</NuxtLink>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Project, useProjectApi } from "~/data/project";
const projectApi = useProjectApi();
const projects = reactive<Project[]>([]);

onMounted(() => {
  projectApi.findProjects().then(_projects => projects.splice(0) && projects.push(..._projects))
});
</script>
