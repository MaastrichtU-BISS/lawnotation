<template>
    <Dialog v-model:visible="visible" modal header="Results" class="w-1/3">
        <TabView class="min-h-[420px]">
            <TabPanel header="Inter-Annotator Agreement">
                <ResultsAgreement :results="metricResults" :loading="loading" class="mt-10"/>
            </TabPanel>
            <TabPanel header="Confidence">
                <ResultsConfidence :results="metricResults.confidence" :loading="loading" class="mt-2"/>
            </TabPanel>
        </TabView>
    </Dialog>
</template>
<script setup lang="ts">
import type {
  MetricResultsTable
} from "~/utils/metrics";
import Dialog from 'primevue/dialog';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import ResultsAgreement from "./ResultsAgreement.vue";
import ResultsConfidence from "./ResultsConfidence.vue";

const visible = defineModel('visible', { type: Boolean, required: true });

const props = defineProps<{
    metricResults: MetricResultsTable,
    loading: boolean;
}>();
</script>
  