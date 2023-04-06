<template>
  <div>
    <h3>Tasks</h3>
    <div v-for="t in tasks" :key="t.id">
      <NuxtLink :to="`/projects/${t.project_id}/tasks/${t.id}`">{{
        t.id + ":" + t.name
      }}</NuxtLink>
    </div>
  </div>
</template>
<script setup lang="ts">
import { createClient } from "@supabase/supabase-js";
const config = useRuntimeConfig();
const supabase = createClient(config.apiUrl, config.apiAnonKey);

const route = useRoute();
const tasks = ref<any>([]);

const fetchTasks = async (id: string) => {
  const { data, error } = await supabase.from("tasks").select().eq("project_id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("TASKS: ", data);
    tasks.value = data;
  }
};
onMounted(() => {
  fetchTasks(route.params.project_id as string);
});
</script>
