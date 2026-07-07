<template>
    <ul class="space-y-2 text-sm">
        <li>
            <label class="block mb-2 text-sm font-medium text-gray-900">Label(s)</label>
            <Multiselect v-model="selectedLabelsOrEmpty" optionValue="name"
                class="w-full" filter :autoFilterFocus="true" :filterFields="['name']" :maxSelectedLabels="1"
                :options="labelsOptions" placeholder="All" @change="emit('updateAnnotations')">
                <template #value="slotProps">
                    <div v-if="slotProps.value?.length == 1">
                        <LabelCmpt class="mr-2"
                            :label="{ color: labelsOptions.find((l) => l.name == slotProps.value[0])?.color!, name: slotProps.value[0] }">
                        </LabelCmpt>
                    </div>
                    <div v-else-if="slotProps.value?.length > 1">
                        {{ `${slotProps.value?.length} items selected` }}
                    </div>
                    <span v-else>
                        {{ slotProps.placeholder }}
                    </span>
                </template>
                <template #option="slotProps">
                    <LabelCmpt :label="slotProps.option"></LabelCmpt>
                </template>
            </Multiselect>
        </li>
        <li>
            <label class="block mb-2 text-sm font-medium text-gray-900">Document(s)</label>
            <Multiselect v-model="selectedDocumentsOrEmpty" class="w-full" optionLabel="label" optionValue="value"
                :options="documentsOptions" placeholder="All" @change="emit('updateAnnotations')" filter
                :autoFilterFocus="true" :maxSelectedLabels="1" />
        </li>
        <li>
            <label class="block mb-2 text-sm font-medium text-gray-900">Annotator(s)</label>
            <Multiselect v-model="selectedAnnotatorsOrEmpty" :options="annotatorsOptions" placeholder="All" class="w-full"
                @change="emit('updateAnnotations')" filter :autoFilterFocus="true" :maxSelectedLabels="1" />
        </li>
        <li v-if="showNonDocumentLevelAgreementParams">
            <!-- Only for span annotations -->
            <table>
                <tbody>
                    <tr>
                        <td><span class="text-sm font-medium text-gray-900 float-right mr-2">Character</span></td>
                        <td>
                            <ToggleSwitch v-model="wordGranularity" @change="emit('updateAnnotations')" />
                        </td>
                        <td><span class="text-sm font-medium text-gray-900 float-left ml-2">Word</span></td>
                        <td> <i class="pi pi-info-circle cursor-pointer border-0"
                                v-tooltip="'Coverage agreement (Krippendorff / Cohen\'s kappa) is computed over character\n or word units of the document text.'"
                                type="text"></i></td>
                    </tr>
                    <tr>
                        <td><span class="text-sm font-medium text-gray-900 float-right mr-2">Exact</span></td>
                        <td>
                            <ToggleSwitch v-model="contained" />
                        </td>
                        <td><span class="text-sm font-medium text-gray-900 float-left ml-2">Contained</span></td>
                        <td><i class="pi pi-info-circle cursor-pointer border-0"
                                v-tooltip="`With 'Exact', span matching requires identical start/end offsets. \nWith \'Contained\', one span being fully inside the other counts as a match.`"
                                type="text"></i></td>
                    </tr>
                </tbody>
            </table>
        </li>
        <li>
            <Button class="w-full mt-4" label="Compute Metrics" size="small" @click="emit('clickComputeMetrics', $event)" />
        </li>
        <li>
            <Button class="w-full" label="Download All" outlined size="small" @click="emit('clickDownloadAll')" />
        </li>
    </ul>
</template>
<script setup lang="ts">
import Multiselect from "primevue/multiselect";
import LabelCmpt from "~/components/labels/Label.vue";
import ToggleSwitch from 'primevue/toggleswitch';

const emit = defineEmits(['clickComputeMetrics', 'clickDownloadAll', 'updateAnnotations']);

const selectedLabelsOrEmpty = defineModel('selectedLabelsOrEmpty', { type: Array<String>, required: true });
const selectedDocumentsOrEmpty = defineModel('selectedDocumentsOrEmpty', { type: Array<String>, required: true });
const selectedAnnotatorsOrEmpty = defineModel('selectedAnnotatorsOrEmpty', { type: Array<String>, required: true });
const contained = defineModel('contained', { type: Boolean, required: false });
const wordGranularity = defineModel('wordGranularity', { type: Boolean, required: false });

defineProps<{
    showNonDocumentLevelAgreementParams: boolean,
    labelsOptions: {
        color: string;
        name: string;
    }[],
    documentsOptions: { value: string; label: string }[],
    annotatorsOptions: string[],
}>();

</script>
<style scoped>
table {
    border-collapse: separate;
    border-spacing: 0 .7em;
}
</style>