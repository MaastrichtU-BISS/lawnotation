<template>
    <Dialog v-model:visible="visible" modal header="Results" class="w-1/2">
        <div v-if="loading" class="min-h-[420px] flex items-center justify-center">
            <HollowDotsSpinner :animation-duration="1000" :size="60" color="#0D5984" />
        </div>
        <Tabs v-else value="agreement" class="min-h-[420px]">
            <TabList>
                <Tab value="agreement">Inter-Annotator Agreement</Tab>
                <Tab value="confidence">Confidence</Tab>
            </TabList>
            <TabPanels>
            <TabPanel value="agreement">
                <ResultsAgreement :report="metricResults?.annotation_metrics" :labelsOptions="labelsOptions" :loading="loading" class="mt-10" />
            </TabPanel>
            <TabPanel value="confidence">
                <ResultsConfidence :results="metricResults?.confidence_metrics" :loading="loading" class="mt-2" />
            </TabPanel>
            </TabPanels>
        </Tabs>
    </Dialog>
</template>
<script setup lang="ts">
import type { IaaMetricsResponse } from "~/utils/iaa";
import Dialog from 'primevue/dialog';
import { HollowDotsSpinner } from "epic-spinners";
import ResultsAgreement from "./ResultsAgreement.vue";
import ResultsConfidence from "./ResultsConfidence.vue";

const visible = defineModel('visible', { type: Boolean, required: true });

const props = defineProps<{
    metricResults: IaaMetricsResponse | undefined,
    labelsOptions: { name: string, color: string }[],
    loading: boolean;
}>();
</script>
