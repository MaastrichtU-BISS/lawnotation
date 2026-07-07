<template>
    <div v-if="!loading">
        <div v-if="!labels.length" class="text-center text-gray-400 py-10">
            No metrics computed yet.
        </div>
        <template v-else>
            <div class="flex justify-between items-center mb-4">
                <label class="text-sm font-medium text-gray-900">Label</label>
                <Select v-model="selectedLabel" :options="labels" class="w-2/3" />
            </div>

            <div v-if="currentLabel" class="space-y-6">
                <div>
                    <h4 class="font-bold text-sm mb-2">Coverage Agreement ({{ report!.meta.granularity }})</h4>
                    <table class="w-full text-sm text-left text-gray-500">
                        <thead class="text-xs text-gray-700 bg-gray-100">
                            <tr>
                                <th class="px-4 py-2">Pair</th>
                                <th class="px-4 py-2 text-center">Cohen's kappa</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="bg-white border-b">
                                <th scope="row" class="px-4 py-2 font-medium text-gray-900">All annotators</th>
                                <td class="px-4 py-2 text-center">
                                    {{ formatNullableFloat(currentLabel.coverage_agreement.krippendorff_alpha) }}
                                    <span class="text-xs text-gray-400">(Krippendorff's α)</span>
                                </td>
                            </tr>
                            <tr v-for="(value, pair) in currentLabel.coverage_agreement.cohen_kappa_pairs" :key="pair"
                                class="bg-white border-b">
                                <th scope="row" class="px-4 py-2 font-medium text-gray-900">{{ formatPairName(pair) }}</th>
                                <td class="px-4 py-2 text-center">{{ formatNullableFloat(value) }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="text-xs text-gray-400 mt-2">
                        <i>{{ report!.meta.notes.coverage_agreement }}</i>
                    </div>
                </div>

                <div>
                    <h4 class="font-bold text-sm mb-2">
                        Span Matching ({{ report!.meta.criterion }})
                        <span class="font-normal text-gray-500">— Macro F1:
                            {{ formatNullableFloat(currentLabel.span_matching.macro_f1) }}</span>
                    </h4>
                    <table v-if="currentLabel.span_matching.pairs" class="w-full text-sm text-left text-gray-500">
                        <thead class="text-xs text-gray-700 bg-gray-100">
                            <tr>
                                <th class="px-4 py-2">Reference</th>
                                <th class="px-4 py-2">Compared to</th>
                                <th class="px-4 py-2 text-center">Precision</th>
                                <th class="px-4 py-2 text-center">Recall</th>
                                <th class="px-4 py-2 text-center">F1</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template v-for="(directions, pair) in currentLabel.span_matching.pairs" :key="pair">
                                <tr v-for="(result, direction) in directions" :key="direction" class="bg-white border-b">
                                    <th scope="row" class="px-4 py-2 font-medium text-gray-900">
                                        {{ formatReference(direction) }}
                                    </th>
                                    <td class="px-4 py-2">{{ formatOtherAnnotator(pair, direction) }}</td>
                                    <td class="px-4 py-2 text-center">{{ formatNullableFloat(result.precision) }}</td>
                                    <td class="px-4 py-2 text-center">{{ formatNullableFloat(result.recall) }}</td>
                                    <td class="px-4 py-2 text-center">{{ formatNullableFloat(result.f1) }}</td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                    <div v-else class="text-sm text-gray-400">N/A (not applicable at document annotation level)</div>
                    <div v-if="report!.meta.notes.span_matching" class="text-xs text-gray-400 mt-2">
                        <i>{{ report!.meta.notes.span_matching }}</i>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
<script setup lang="ts">
import Select from 'primevue/select';
import type { IaaReport } from "~/utils/iaa";
import { stripAnnotatorPrefix, formatNullableFloat } from "~/utils/iaa";

const props = defineProps<{
    report: IaaReport | undefined;
    loading: boolean;
}>();

const labels = computed(() => Object.keys(props.report?.per_label ?? {}));
const selectedLabel = ref<string>();

watch(labels, (newLabels) => {
    if (!selectedLabel.value || !newLabels.includes(selectedLabel.value)) {
        selectedLabel.value = newLabels[0];
    }
}, { immediate: true });

const currentLabel = computed(() => {
    if (!selectedLabel.value) return undefined;
    return props.report?.per_label[selectedLabel.value];
});

const formatPairName = (pair: string): string => {
    return pair
        .split("_vs_")
        .map((a) => stripAnnotatorPrefix(a))
        .join(" vs ");
};

const formatReference = (direction: string): string => {
    return stripAnnotatorPrefix(direction.replace(/_as_reference$/, ""));
};

const formatOtherAnnotator = (pair: string, direction: string): string => {
    const reference = direction.replace(/_as_reference$/, "");
    const [a, b] = pair.split("_vs_");
    return stripAnnotatorPrefix((reference === a ? b : a) ?? "");
};
</script>
