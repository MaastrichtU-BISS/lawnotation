<template>
  <div>
    <div v-if="alert_assigned_task_id"
      class="p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
      <span class="font-medium">Assign alert!</span>
      You have been assigned to a new task. <NuxtLink :to="`/annotate/${alert_assigned_task_id}?seq=1`">Click here
      </NuxtLink> to start annotating
    </div>
    <section class="flex justify-center p-6 py-12 my-5 bg-white border border-gray-200 rounded-lg shadow"
      v-if="nextAssignment">
      <div class="">
        <h2 class="text-2xl font-bold leading-9 tracking-tight text-center text-gray-700">
          Continue where you left off
        </h2>
        <NuxtLink :to="`/annotate/${nextAssignment.task_id}?seq=${nextAssignment.seq_pos}`">
          <button
            class="w-full flex justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600">
            Start annotating
          </button>
        </NuxtLink>
      </div>
    </section>
    <section class="flex justify-center p-6 py-16 my-5 bg-blue-50 border border-gray-200 rounded-lg shadow gap-10"
      :class="(!nextAssignment) ? 'mt-12' : ''">
      <IndexCard url="/projects" title="Create new project" icon="pi pi-file"/>
      <IndexCard url="/published" title="Browse published data" icon="pi pi-search" />
    </section>
  </div>
</template>
<script setup lang="ts">
import type { Assignment } from "~/types/assignment";
import IndexCard from "~/components/IndexCard.vue";

const user = useSupabaseUser();

const supa = useSupabaseClient();
const role = ref<string>();

const { $trpc } = useNuxtApp();
const nextAssignment = ref<Assignment | null>(null);
const alert_assigned_task_id = ref<number>()


onMounted(async () => {
  if (user.value?.user_metadata?.assigned_task_id) {
    alert_assigned_task_id.value = user.value?.user_metadata?.assigned_task_id;
    await $trpc.user.clearInviteMetadata.mutate();
    supa.auth.refreshSession()
  }

  $trpc.assignment.findNextAssignmentByUser.query().then((result) => {
    nextAssignment.value = result;
  });
})

definePageMeta({
  middleware: ['auth']
})
</script>

