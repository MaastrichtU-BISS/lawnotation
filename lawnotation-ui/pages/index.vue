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
      <IndexCard url="/projects" title="Create new project" svg-d="M18 9V4a1 1 0 0 0-1-1H8.914a1 1 0 0 0-.707.293L4.293 7.207A1 1 0 0 0 4 7.914V20a1 1 0 0 0 1 1h4M9 3v4a1 1 0 0 1-1 1H4m11 6v4m-2-2h4m3 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z" />
      <IndexCard url="/published" title="Browse published data" svg-d="M10 3v4a1 1 0 0 1-1 1H5m8 7.5 2.5 2.5M19 4v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Zm-5 9.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
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
  console.log(user.value?.user_metadata)
  if (user.value?.user_metadata?.assigned_task_id) {
    alert_assigned_task_id.value = user.value?.user_metadata?.assigned_task_id;
    await $trpc.user.clearInviteMetadata.mutate();
    supa.auth.refreshSession()
  }

  $trpc.assignment.findNextAssignmentByUser.query(user.value?.id!).then((result) => {
    nextAssignment.value = result;
  });
})

definePageMeta({
  middleware: ['auth']
})
</script>

