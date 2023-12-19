<template>
  <div
    id="difficultyMetricsModal"
    tabindex="-1"
    aria-hidden="true"
    class="fixed top-0 left-0 right-0 z-50 hidden w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full"
  >
    <div class="relative w-full max-w-2xl max-h-full">
      <!-- Modal content -->
      <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
        <!-- Modal header -->
        <div
          class="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600"
        >
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Confidence Metrics
          </h3>
          <button
            type="button"
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
            data-modal-hide="difficultyMetricsModal"
          >
            <svg
              class="w-3 h-3"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 14"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
              />
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <!-- Modal body -->
        <div class="p-6 space-y-6">
          <div class="items-center justify-center">
            <div class="ml-5 pl-5">
              <div class="flex items-center mb-2">
                <svg
                  v-for="i in [1, 2, 3, 4, 5]"
                  class="w-4 h-4 mr-1"
                  :class="
                    i <= Math.round(modelValue?.average)
                      ? 'text-yellow-300'
                      : 'text-gray-300'
                  "
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 22 20"
                >
                  <path
                    d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z"
                  />
                </svg>
                <p class="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                  {{ modelValue?.average.toFixed(2) }} average
                </p>
              </div>
              <p class="inline text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ modelValue?.rated }} /
                {{ modelValue?.total }}
              </p>
              <span class="ml-2 text-sm font-small text-gray-400 dark:text-gray-400"
                >({{ ((modelValue?.rated / modelValue?.total) * 100).toFixed(0) }}%)</span
              >
              <div v-for="i in [5, 4, 3, 2, 1]" class="flex items-center mt-4">
                <a
                  href="#"
                  class="text-sm font-medium text-blue-600 dark:text-blue-500 hover:underline"
                  >{{ i }} star</a
                >
                <div class="w-2/4 h-5 mx-4 bg-gray-200 rounded dark:bg-gray-700">
                  <div
                    class="h-5 bg-yellow-300 rounded"
                    :style="`width: ${
                      (modelValue?.values[i] / modelValue?.total) * 100
                    }%`"
                  ></div>
                </div>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{
                  modelValue?.values[i]
                }}</span>
                <span class="ml-2 text-sm font-small text-gray-400 dark:text-gray-400"
                  >({{
                    ((modelValue?.values[i] / modelValue?.total) * 100).toFixed(1)
                  }}%)</span
                >
              </div>
            </div>
          </div>
          <div class="text-center">
            <span>
              <div class="font-bold">
                Krippendorff's alpha:
                {{ modelValue?.krippendorff?.result?.toFixed(3) }}
              </div>
              <div class="">p0: {{ modelValue?.krippendorff?.po?.toFixed(3) }}</div>
              <div class="">pe: {{ modelValue?.krippendorff?.pe?.toFixed(3) }}</div>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { DifficultyMetricResult } from "~/utils/metrics";
const props = defineProps<{
  modelValue: DifficultyMetricResult;
}>();
onMounted(() => {
  console.log(props.modelValue);
});
</script>
