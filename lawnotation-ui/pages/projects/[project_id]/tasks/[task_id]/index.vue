<template>
  <div v-if="task">
    <h3>{{ task }}</h3>
    <span>Go to: </span
    ><NuxtLink :to="`/projects/${task.project_id}/tasks/${task.id}/annotate`"
      >Annotate</NuxtLink
    >
  </div>
</template>
<script setup lang="ts">
const supabase = useSupabaseClient();

const route = useRoute();
const task = ref();

const fetchTask = async (id: string) => {
  const { data, error } = await supabase.from("tasks").select().eq("id", id);
  if (error) {
    console.log("ERROR: ", error);
  }
  if (data) {
    console.log("TASK: ", data);
    task.value = data[0];
  }
};
onMounted(() => {
  fetchTask(route.params.task_id as string);
});

definePageMeta({
  middleware: ["auth"],
});
</script>
