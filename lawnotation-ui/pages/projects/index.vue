<template>
  <div>
    <h3>Projects</h3>
    <div v-for="p in projects" :key="p.id">
      <NuxtLink :to="`/projects/${p.id}`">{{ p.id + ":" + p.name }}</NuxtLink>
    </div>
  </div>
</template>
<script setup lang="ts">
import { createClient } from "@supabase/supabase-js";
const config = useRuntimeConfig();
const supabase = createClient(config.apiUrl, config.apiAnonKey);

const projects = ref<any>([]);

const fetchProjects = async () => {
  const { data, error } = await supabase.from("projects").select();
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("PROJECTS: ", data);
    projects.value = data;
  }
};
onMounted(() => {
  fetchProjects();
});
</script>
