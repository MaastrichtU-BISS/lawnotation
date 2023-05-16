<template>
  <div class="dimmer">
    <Dimmer v-model="loading" />
    <div class="dimmer-content">
      <h3 class="my-3 text-lg font-semibold mb-2">Tasks: {{ tasks.length }}</h3>
      <ul v-for="t in tasks" :key="t.id" class="list-disc list-inside">
        <li>
          <span>
            {{ t.id }}.
            <NuxtLink :to="`/annotate/${t.id}`">{{ t.name }}</NuxtLink>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Task, useTaskApi } from "~/data/task";

const { $toast } = useNuxtApp();

const user = useSupabaseUser();
const taskApi = useTaskApi();

const route = useRoute();
const loading = ref(false);
const tasks = reactive<Task[]>([]);

const loadTasks = async () => {
  try {
    loading.value = true;
    taskApi
      .getAllAnnotatorTasks(user.value!.id.toString())
      .then((_tasks) => {
        tasks.splice(0) && tasks.push(..._tasks);
        loading.value = false;
      })
      .catch((error) => {
        loading.value = false;
      });
  } catch (error) {
    if (error instanceof Error) $toast.error(`Error loading projects: ${error.message}`);
  }
};

onMounted(() => {
  if (user.value) loadTasks();
  else {
    watch(user, () => {
      if (user.value) {
        loadTasks();
      }
    });
  }
});

definePageMeta({
  middleware: ["auth"],
});
</script>
