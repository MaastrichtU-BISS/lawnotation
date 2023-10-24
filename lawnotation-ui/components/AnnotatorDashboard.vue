<template>
  <div>
    <section
      class="charts my-5 py-12 flex justify-center p-6 bg-white border border-gray-200 rounded-lg shadow"
    >
      <div class="">
        <h2 class="text-center text-2xl font-bold leading-9 tracking-tight text-gray-700">
          Continue where you left off
        </h2>
        <NuxtLink
          :to="`/annotate/${nextAssignment?.task_id}?seq=${nextAssignment?.seq_pos}`"
        >
          <button
            class="w-full flex justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
          >
            Start annotating
          </button>
        </NuxtLink>
      </div>
    </section>
    <ClientOnly
      ><section
        class="charts my-5 py-12 flex justify-center p-6 bg-white border border-gray-200 rounded-lg shadow"
      >
        <span style="width: 400px">
          <apexchart
            id="difficulty"
            :options="chartCompletionOptions"
            :series="chartCompletionSeries"
          ></apexchart>
        </span></section
    ></ClientOnly>
  </div>
</template>
<script setup lang="ts">
import type { Assignment } from "~/types";

const { $trpc } = useNuxtApp();

const user = useSupabaseUser();
const assignmentsCount = ref<number>(0);
const nextAssignment = ref<Assignment>();

const chartCompletionOptions = ref({
  chart: {
    type: "donut",
    id: "completion",
  },
  title: {
    text: "Assignments completion",
    align: "center",
  },
  subtitle: {
    text: `Total: 0`,
    align: "center",
  },
  legend: {
    position: "bottom",
  },
  labels: ["Done", "Pending"],
  colors: ["rgb(0, 227, 150)", "rgb(255, 69, 96)"],
});
const chartCompletionSeries = reactive<number[]>([0, 0]);

onMounted(async () => {
  $trpc.assignment.getCompletionByAnnotator.query(user.value?.id!).then((result) => {
    for (let i = 0; i < result.length; i++) {
      chartCompletionSeries[i] = result[i].count;
      assignmentsCount.value += result[i].count;
    }
    chartCompletionOptions.value = {
      ...chartCompletionOptions.value,
      subtitle: {
        text: `Total: ${assignmentsCount.value}`,
        align: "center",
      },
    };
  });

  $trpc.assignment.findNextAssignmentByUser.query(user.value?.id!).then((result) => {
    nextAssignment.value = result;
  });
});
</script>
<style></style>
