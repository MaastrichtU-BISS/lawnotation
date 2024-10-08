<template>
    <table class="w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-100">
            <tr>
                <th scope="col" class="px-6 py-3">Metric</th>
                <th scope="col" class="px-6 py-3 text-center">Value</th>
            </tr>
        </thead>
        <tbody>
            <tr class="bg-white border-b">
                <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    Krippendorff's alpha
                </th>
                <td class="px-6 py-4 text-center">
                    <span v-if="!loading">{{
                        results?.krippendorff?.result?.toFixed(3) ?? "-"
                    }}</span>
                </td>
            </tr>
            <tr class="bg-white border-b">
                <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    Fleiss' kappa
                </th>
                <td class="px-6 py-4 text-center">
                    <span v-if="!loading">{{
                        results?.fleiss_kappa?.result?.toFixed(3) ?? "-"
                    }}</span>
                </td>
            </tr>
            <tr class="bg-white">
                <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    Cohen's kappa
                </th>
                <td class="px-6 py-4 text-center">
                    <span v-if="!loading">{{
                        results?.cohens_kappa?.result?.toFixed(3) ?? "-"
                    }}</span>
                </td>
            </tr>
        </tbody>
    </table>
</template>
<script setup lang="ts">
import type {
  MetricResultsTable
} from "~/utils/metrics";
const props = defineProps<{
    results: MetricResultsTable,
    loading: boolean;
}>();
</script>