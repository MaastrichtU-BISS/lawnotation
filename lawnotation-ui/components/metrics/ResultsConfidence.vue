<template>
  <div v-if="!loading && results">
    <div class="items-center justify-center">
      <div class="flex justify-between">
        <div class="flex items-center mb-2">
          <i v-for="i in [1, 2, 3, 4, 5]" class="w-4 h-4 mr-1 pi" :class="i <= Math.round(results.mean ?? 0)
            ? 'text-yellow-300 pi-star-fill'
            : 'text-gray-300 pi-star'">
          </i>
          <p class="ml-2 text-sm font-medium text-gray-900 dark:text-white">
            {{ formatNullableFloat(results.mean, 2) }} average
          </p>
        </div>
        <div>
          <p class="inline text-sm font-medium text-gray-500 dark:text-gray-400">
            {{ results.rated }} /
            {{ results.total }}
          </p>
          <span class="ml-2 text-sm font-small text-gray-400 dark:text-gray-400">({{ results.total ?
            ((results.rated / results.total) * 100).toFixed(0) : 0 }}%)</span>
        </div>
      </div>
      <div v-for="i in [5, 4, 3, 2, 1]" class="flex justify-center items-center mt-4">
        <span>{{ i }} <i class="pi pi-star-fill text-yellow-300" /></span>
        <div class="w-2/4 h-5 mx-4 bg-gray-200 rounded dark:bg-gray-700">
          <div class="h-5 bg-yellow-300 rounded" :style="`width: ${results.total ? ((results.counts[i] ?? 0) / results.total) * 100 : 0
            }%`"></div>
        </div>
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{
          results.counts[i]
        }}</span>
        <span class="ml-2 text-sm font-small text-gray-400 dark:text-gray-400">({{
          results.total ? (((results.counts[i] ?? 0) / results.total) * 100).toFixed(1) : 0
        }}%)</span>
      </div>
    </div>
    <div class="text-center mt-4">
      <div class="font-bold">
        Krippendorff's alpha (all annotators): {{ formatNullableFloat(results.krippendorff_alpha) }}
      </div>
      <table v-if="pairs.length" class="w-full text-sm text-left text-gray-500 mt-2">
        <thead class="text-xs text-gray-700 bg-gray-100">
          <tr>
            <th class="px-4 py-2">Pair</th>
            <th class="px-4 py-2 text-center">Krippendorff's alpha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[pair, value] in pairs" :key="pair" class="bg-white border-b">
            <th scope="row" class="px-4 py-2 font-medium text-gray-900">{{ formatPairName(pair) }}</th>
            <td class="px-4 py-2 text-center">{{ formatNullableFloat(value) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { DifficultyRatingSummary } from "~/utils/iaa";
import { formatNullableFloat, stripAnnotatorPrefix } from "~/utils/iaa";

const props = defineProps<{
  results: DifficultyRatingSummary | undefined;
  loading: boolean;
}>();

const pairs = computed(() => Object.entries(props.results?.krippendorff_alpha_pairs ?? {}));

const formatPairName = (pair: string): string => {
  return pair
    .split("_vs_")
    .map((a) => stripAnnotatorPrefix(a))
    .join(" vs ");
};
</script>
