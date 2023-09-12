<template>
  <div>
    <section class="countups my-5 pt-5">
      <div class="flex justify-center text-center">
        <div
          class="p-6 bg-white border border-gray-200 rounded-lg shadow"
          style="min-height: 162px"
        >
          <span class="inline-block mx-5 px-8">
            <svg
              class="w-7 h-7 text-gray-500 mb-3 inline"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M8 1V0v1Zm4 0V0v1Zm2 4v1h1V5h-1ZM6 5H5v1h1V5Zm2-3h4V0H8v2Zm4 0a1 1 0 0 1 .707.293L14.121.879A3 3 0 0 0 12 0v2Zm.707.293A1 1 0 0 1 13 3h2a3 3 0 0 0-.879-2.121l-1.414 1.414ZM13 3v2h2V3h-2Zm1 1H6v2h8V4ZM7 5V3H5v2h2Zm0-2a1 1 0 0 1 .293-.707L5.879.879A3 3 0 0 0 5 3h2Zm.293-.707A1 1 0 0 1 8 2V0a3 3 0 0 0-2.121.879l1.414 1.414ZM2 6h16V4H2v2Zm16 0h2a2 2 0 0 0-2-2v2Zm0 0v12h2V6h-2Zm0 12v2a2 2 0 0 0 2-2h-2Zm0 0H2v2h16v-2ZM2 18H0a2 2 0 0 0 2 2v-2Zm0 0V6H0v12h2ZM2 6V4a2 2 0 0 0-2 2h2Zm16.293 3.293C16.557 11.029 13.366 12 10 12c-3.366 0-6.557-.97-8.293-2.707L.293 10.707C2.557 12.971 6.366 14 10 14c3.634 0 7.444-1.03 9.707-3.293l-1.414-1.414ZM10 9v2a2 2 0 0 0 2-2h-2Zm0 0H8a2 2 0 0 0 2 2V9Zm0 0V7a2 2 0 0 0-2 2h2Zm0 0h2a2 2 0 0 0-2-2v2Z"
              />
            </svg>
            <h5 class="mb-2 text-2xl font-semibold tracking-tight text-gray-600">
              Projects
              <count-up :end-val="projectsCount" :duration="0.7"></count-up>
            </h5>
          </span>
          <span class="inline-block mx-5 px-8">
            <svg
              class="w-7 h-7 text-gray-500 mb-3 inline"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="white"
              viewBox="0 0 20 20"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M1 17V2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M5 15V1m8 18v-4"
              />
            </svg>
            <h5 class="mb-2 text-2xl font-semibold tracking-tight text-gray-600">
              Tasks
              <count-up :end-val="tasksCount" :duration="0.7"></count-up>
            </h5>
          </span>
          <span class="inline-block mx-5 px-8">
            <svg
              class="w-7 h-7 text-gray-500 mb-3 inline"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="white"
              viewBox="0 0 20 20"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 1v3m5-3v3m5-3v3M1 7h7m1.506 3.429 2.065 2.065M19 7h-2M2 3h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm6 13H6v-2l5.227-5.292a1.46 1.46 0 0 1 2.065 2.065L8 16Z"
              />
            </svg>
            <h5 class="mb-2 text-2xl font-semibold tracking-tight text-gray-600">
              Assignments
              <count-up :end-val="assignmentsCount" :duration="0.7"></count-up>
            </h5>
          </span>
        </div>
      </div>
    </section>
    <ClientOnly
      ><section
        class="charts my-5 py-12 flex justify-center p-6 bg-white border border-gray-200 rounded-lg shadow"
      >
        <span style="width: 400px">
          <apexchart
            id="difficulty"
            :options="chartDifficultyOptions"
            :series="chartDifficultySeries"
          ></apexchart>
        </span>
        <span style="width: 400px">
          <apexchart
            id="completion"
            :options="chartCompletionOptions"
            :series="chartCompletionSeries"
            :ref="hello"
          ></apexchart>
        </span></section
    ></ClientOnly>
  </div>
</template>
<script setup lang="ts">
import { Project } from "~/types";
import { Task } from "~/types";
import { Assignment } from "~/types";
import CountUp from "vue-countup-v3";

const { $trpc } = useNuxtApp();

const user = useSupabaseUser();
const projectsCount = ref<number>(0);
const tasksCount = ref<number>(0);
const assignmentsCount = ref<number>(0);
const assignmentsRated = ref<number>(0);

const chartDifficultyOptions = ref({
  chart: {
    type: "donut",
    id: "difficulty",
  },
  title: {
    text: "Assignments difficulty",
    align: "center",
  },
  subtitle: {
    text: `Average: 0}`,
    align: "center",
  },
  legend: {
    position: "bottom",
  },
  labels: ["Unrated", "Very Easy", "Easy", "Normal", "Hard", "Very Hard"],
  colors: [
    "rgb(173, 216, 230)",
    "rgb(0, 227, 150)",
    "rgb(59, 130, 246)",
    "rgb(254, 176, 25)",
    "rgb(255, 69, 96)",
    "rgb(119, 93, 208)",
  ],
});
const chartDifficultySeries = reactive<number[]>([0, 0, 0, 0, 0, 0]);
const chartDifficultyAverage = ref<number>(0);
const chartCompletionOptions = ref({
  chart: {
    type: "donut",
    id: "completion",
  },
  title: {
    text: "Assignments completion",
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
  $trpc.project.getCountByUser.query(user.value?.id!).then((result) => {
    if (result)
      projectsCount.value = result;
  });
  $trpc.task.getCountByUser.query(user.value?.id!).then((result) => {
    tasksCount.value = result;
  });

  $trpc.assignment.getDifficultiesByEditor.query(user.value?.id!).then((result) => {
    result.map((r) => {
      chartDifficultySeries[r.difficulty] += r.count;
      chartDifficultyAverage.value += r.difficulty * r.count;
      assignmentsCount.value += r.count;
      if (r.difficulty > 0) assignmentsRated.value += r.count;
    });
    chartDifficultyAverage.value /= assignmentsRated.value;
    chartDifficultyOptions.value = {
      ...chartDifficultyOptions.value,
      subtitle: {
        text: `Average: ${chartDifficultyAverage.value.toFixed(2)}`,
        align: "center",
      },
    };
  });

  $trpc.assignment.getCompletionByEditor.query(user.value?.id!).then((result) => {
    for (let i = 0; i < result.length; i++) {
      chartCompletionSeries[i] = result[i].count;
    }
  });
});
</script>
<style></style>
