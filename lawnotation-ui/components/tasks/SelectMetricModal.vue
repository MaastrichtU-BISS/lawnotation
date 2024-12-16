<template>
    <Dialog modal header="Select what kind of metrics you want to analyze" v-model:visible="visible" class="min-w-[750px]">
        <section class="flex justify-center p-6 bg-blue-50 border border-gray-200 rounded-lg shadow gap-10">
            <IndexCard :url="`${baseUrl}?descriptive`" title="Descriptive" icon="pi pi-tags"
                description="Dive into the annotations in an interactive way and export usefull data and metrics." />
            <IndexCard :url="`${baseUrl}?agreement`" title="Agreement" icon="pi pi-users"
                :description="!disableAgreement ? 'Asses the consensus among the annotators using different Intercoder Reliability metrics.' 
                    : 'A task must have more than 1 annotator to compute Intercoder Reliability metrics.'"
                :disabled="disableAgreement" />
        </section>
    </Dialog>
</template>
<script setup lang="ts">
import Dialog from "primevue/dialog";
import IndexCard from "~/components/IndexCard.vue";

const visible = defineModel<boolean>("visible", { required: true });
const { baseUrl, disableAgreement } = defineProps<{ baseUrl: string; disableAgreement: boolean }>();

</script>
