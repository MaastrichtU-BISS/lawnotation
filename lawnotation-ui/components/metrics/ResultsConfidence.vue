<template>
  <div v-if="!loading">
    <div class="items-center justify-center">
      <div class="flex justify-between">
        <div class="flex items-center mb-2">
          <i v-for="i in [1, 2, 3, 4, 5]" class="w-4 h-4 mr-1 pi" :class="i <= Math.round(results?.average)
            ? 'text-yellow-300 pi-star-fill'
            : 'text-gray-300 pi-star'">
          </i>
          <p class="ml-2 text-sm font-medium text-gray-900 dark:text-white">
            {{ results?.average?.toFixed(2) }} average
          </p>
        </div>
        <div>
          <p class="inline text-sm font-medium text-gray-500 dark:text-gray-400">
            {{ results?.rated }} /
            {{ results?.total }}
          </p>
          <span class="ml-2 text-sm font-small text-gray-400 dark:text-gray-400">({{ ((results?.rated /
            results?.total) * 100).toFixed(0) }}%)</span>
        </div>
      </div>
      <div v-for="i in [5, 4, 3, 2, 1]" class="flex justify-center items-center mt-4">
        <span>{{ i }} <i class="pi pi-star-fill text-yellow-300" /></span>
        <div class="w-2/4 h-5 mx-4 bg-gray-200 rounded dark:bg-gray-700">
          <div class="h-5 bg-yellow-300 rounded" :style="`width: ${(results?.values[i] / results?.total) * 100
            }%`"></div>
        </div>
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{
          results?.values[i]
        }}</span>
        <span class="ml-2 text-sm font-small text-gray-400 dark:text-gray-400">({{
          ((results?.values[i] / results?.total) * 100).toFixed(1)
        }}%)</span>
      </div>
    </div>
    <div class="text-center mt-2">
      <span>
        <div class="font-bold">
          Krippendorff's alpha:
          {{ results?.krippendorff?.result?.toFixed(3) ?? '-' }}
        </div>
        <div class="">p0: {{ results?.krippendorff?.po?.toFixed(3) ?? '-' }}</div>
        <div class="">pe: {{ results?.krippendorff?.pe?.toFixed(3) ?? '-' }}</div>
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { ConfidenceMetricResult } from "~/utils/metrics";
const props = defineProps<{
  results: ConfidenceMetricResult;
  loading: boolean;
}>();
</script>
