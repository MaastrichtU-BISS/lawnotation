<template>
    <Dialog v-model:visible="visible" modal header="Results" class="w-1/3">
        <Tabs value="agreement" class="min-h-[420px]">
            <TabList>
                <Tab value="agreement">Inter-Annotator Agreement</Tab>
                <Tab value="confidence">Confidence</Tab>
            </TabList>
            <TabPanels>
            <TabPanel value="agreement">
                <ResultsAgreement :results="metricResults" :loading="loading" class="mt-10" />
            </TabPanel>
            <TabPanel value="confidence">
                <ResultsConfidence :results="metricResults.confidence" :loading="loading" class="mt-2" />
            </TabPanel>
            </TabPanels>
        </Tabs>
    </Dialog>
</template>
<script setup lang="ts">
import type {
  MetricResultsTable
} from "~/utils/metrics";
import Dialog from 'primevue/dialog';
import ResultsAgreement from "./ResultsAgreement.vue";
import ResultsConfidence from "./ResultsConfidence.vue";

const visible = defineModel('visible', { type: Boolean, required: true });

const props = defineProps<{
    metricResults: MetricResultsTable,
    loading: boolean;
}>();
</script>
  