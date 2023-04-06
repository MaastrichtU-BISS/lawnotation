<template>
  <div>
    <h3>{{ project }}</h3>
    <span>Go to: </span><NuxtLink :to="`/projects/${project.id}/tasks`">Tasks</NuxtLink>
  </div>
</template>
<script setup lang="ts">
import { createClient } from "@supabase/supabase-js";
const config = useRuntimeConfig();
const supabase = createClient(config.apiUrl, config.apiAnonKey);

const route = useRoute();
const project = ref({});

const fetchProject = async (id: string) => {
  const { data, error } = await supabase.from("projects").select().eq("id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("PROJECT: ", data);
    project.value = data[0];
  }
};
onMounted(() => {
  fetchProject(route.params.project_id as string);
});
</script>
