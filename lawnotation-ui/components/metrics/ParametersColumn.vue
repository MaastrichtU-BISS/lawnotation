<template>
    <ul class="space-y-2 text-sm">
        <li>
            <label class="block mb-2 text-sm font-medium text-gray-900">Label(s)</label>
            <Multiselect v-if="metricType == MetricTypes.DESCRIPTIVE" v-model="selectedLabelsOrEmpty" optionValue="name"
                class="w-full" filter autoFilterFocus="true" :filterFields="['name']" :maxSelectedLabels="1"
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
            <Dropdown v-else-if="metricType == MetricTypes.AGREEMENT" v-model="selectedLabelsOrEmpty[0]" optionValue="name"
                class="w-full" filter autoFilterFocus="true" :filterFields="['name']" :options="labelsOptions"
                placeholder="Select label" @change="emit('updateAnnotations')">
                <template #value="slotProps">
                    <div v-if="slotProps.value?.length">
                        <LabelCmpt class="mr-2"
                            :label="{ color: labelsOptions.find((l) => l.name == slotProps.value)?.color!, name: slotProps.value }">
                        </LabelCmpt>
                    </div>
                    <span v-else>
                        {{ slotProps.placeholder }}
                    </span>
                </template>
                <template #option="slotProps">
                    <LabelCmpt :label="slotProps.option"></LabelCmpt>
                </template>
            </Dropdown>
        </li>
        <li>
            <label class="block mb-2 text-sm font-medium text-gray-900">Document(s)</label>
            <Multiselect v-model="selectedDocumentsOrEmpty" class="w-full" optionLabel="label" optionValue="value"
                :options="documentsOptions" placeholder="All" @change="emit('updateAnnotations')" filter
                autoFilterFocus="true" :maxSelectedLabels="1" />
        </li>
        <li>
            <label class="block mb-2 text-sm font-medium text-gray-900">Annotator(s)</label>
            <Multiselect v-model="selectedAnnotatorsOrEmpty" :options="annotatorsOptions" placeholder="All" class="w-full"
                @change="emit('updateAnnotations')" filter autoFilterFocus="true" :maxSelectedLabels="1" />
        </li>
        <li v-if="showNonDocumentLevelAgreementParams">
            <!-- Only for span annotations -->
            <div>
                <div class="flex justify-between">
                    <label for="small-input"
                        class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tolerance</label>
                    <i class="pi pi-info-circle cursor-pointer border-0 self-center"
                        v-tooltip="'A tolerance of 1 allows for small differences of one character\n while still considering them as agreements.\n Higher tolerance offers more flexibility in matching.'"
                        type="text"></i>
                </div>
                <InputNumber v-model="tolerance" class="w-full" showButtons buttonLayout="horizontal" inputId="small-input"
                    :min="0" :max="10" :step="1">
                    <template #incrementbuttonicon>
                        <span class="pi pi-plus" />
                    </template>
                    <template #decrementbuttonicon>
                        <span class="pi pi-minus" />
                    </template>
                </InputNumber>
            </div>
            <table>
                <tbody>
                    <tr>
                        <td><span class="text-sm font-medium text-gray-900 float-right mr-2">Annotation</span></td>
                        <td>
                            <InputSwitch v-model="separate_into_words"
                                @change="emit('updateAnnotations', props.metricType)" />
                        </td>
                        <td><span class="text-sm font-medium text-gray-900 float-left ml-2">Word</span></td>
                        <td> <i class="pi pi-info-circle cursor-pointer border-0"
                                v-tooltip="'Choose between comparing entire chunks with annotations\n or individual words\' annotations.'"
                                type="text"></i></td>
                    </tr>
                    <tr>
                        <td><span class="text-sm font-medium text-gray-900 float-right mr-2">Equal</span></td>
                        <td>
                            <InputSwitch v-model="contained" @change="tolerance = 0" />
                        </td>
                        <td><span class="text-sm font-medium text-gray-900 float-left ml-2">Overlap</span></td>
                        <td><i class="pi pi-info-circle cursor-pointer border-0"
                                v-tooltip="`With 'Equal Overlap\', annotations must match exactly. \nWith \'Overlapping Annotations\', any degree of overlap counts as agreement.`"
                                type="text"></i></td>
                    </tr>
                    <tr>
                        <td><span class="text-sm font-medium text-gray-900 float-right mr-2 text-right">Include NTA</span>
                        </td>
                        <td>
                            <InputSwitch v-model="hideNonText" @change="emit('updateAnnotations')" />
                        </td>
                        <td><span class="ext-sm font-medium text-gray-900 float-left ml-2">Exclude NTA</span></td>
                        <td><i class="pi pi-info-circle cursor-pointer border-0"
                                v-tooltip="'Decide whether to factor in non-text annotations (NTA) \n(e.g., \'. 2.\') that do not consist of regular text.\n When \'Include\' is chosen, these annotations contribute to agreement calculations.\n When \'Ignore\' is chosen, they are excluded from calculations.'"
                                type="text"></i></td>
                    </tr>
                </tbody>
            </table>
        </li>
        <li v-if="metricType == MetricTypes.AGREEMENT">
            <Button class="w-full mt-4" label="Compute Metrics" size="small" @click="emit('clickComputeMetrics', $event)" />
        </li>
        <li>
            <Button class="w-full" :class="metricType == MetricTypes.DESCRIPTIVE ? 'mt-4' : ''" label="Download All"
                outlined size="small" @click="emit('clickDownloadAll')" />
        </li>
        <div v-if="metricType == MetricTypes.AGREEMENT">
            <Divider class="py-6" />
            <div class="flex justify-end">
                <i class="pi pi-info-circle cursor-pointer border-0 self-center"
                    v-tooltip="'(Optional). Search for tasks among all your projects that:\n* Have the same annotators as the current task\n * Have the same documents\n* Have the same labelset\nAnd perform the Agreement calculations of the individual annotators\nagainst themselves from task to task.\n(You can create tasks like these by, for example:\nReplicating Tasks or Exporting/Importing Tasks)'"
                    type="text"></i>
            </div>
            <Accordion>
                <AccordionTab header="Intra-Annotator-Agreement">
                    <Button v-if="!optionSimilarTasks?.length" type="button" label="Find similar tasks" icon="pi pi-search"
                        :loading="loadingSimilarTasks" @click="loadSimilarTasks" class="w-full" />
                    <template v-else>
                        <Dropdown v-model="selectedSimilarTask" :options="optionSimilarTasks" showClear filter
                            optionLabel="name" optionValue="id" placeholder="Select a task" class="w-full" />
                        <i class="pi pi-info-circle cursor-pointer border-0 self-center float-end"
                        v-tooltip="'This will create a replica of the current task.\n After that, the replica will be merged with the similar task. \n Then you will be redirected to the metrics#agreement page of the newly created task\nThere you will have the option to compute intra-annotator-agreement-metrics.'"
                            type="text"></i>
                        <Button :disabled="!selectedSimilarTask" class="w-full" label="Merge tasks" outlined size="small"
                            @click="emit('mergeTasks', selectedSimilarTask)"/>
                    </template>
                </AccordionTab>
            </Accordion>
        </div>
    </ul>
</template>
<script setup lang="ts">
import { MetricTypes } from "~/utils/enums";
import Dropdown from 'primevue/dropdown';
import Multiselect from "primevue/multiselect";
import LabelCmpt from "~/components/labels/Label.vue";
import InputSwitch from 'primevue/inputswitch';
import InputNumber from 'primevue/inputnumber';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import Divider from 'primevue/divider';

const { $trpc } = useNuxtApp();
const route = useRoute();

const emit = defineEmits(['clickComputeMetrics', 'clickDownloadAll', 'updateAnnotations', 'mergeTasks']);

const selectedLabelsOrEmpty = defineModel('selectedLabelsOrEmpty', { type: Array<String>, required: true });
const selectedDocumentsOrEmpty = defineModel('selectedDocumentsOrEmpty', { type: Array<String>, required: true });
const selectedAnnotatorsOrEmpty = defineModel('selectedAnnotatorsOrEmpty', { type: Array<String>, required: true });
const tolerance = defineModel('tolerance', { type: Number, required: false });
const contained = defineModel('contained', { type: Boolean, required: false });
const hideNonText = defineModel('hideNonText', { type: Boolean, required: false });
const separate_into_words = defineModel('separate_into_words', { type: Boolean, required: false });

//#region Intra-Annotator-Agreement
const loadingSimilarTasks = ref<boolean>(false);
const optionSimilarTasks = ref<{ id: number; name: string }[]>([]);
const selectedSimilarTask = ref<number>();

const loadSimilarTasks = async () => {
    loadingSimilarTasks.value = true;
    optionSimilarTasks.value = await $trpc.task.findSimilarTasks.query({
        task_id: +route.params.task_id,
        annotators: props.annotatorsOptions
    });
    loadingSimilarTasks.value = false;
};
//#endregion

const props = defineProps<{
    metricType: MetricTypes,
    showNonDocumentLevelAgreementParams: boolean,
    labelsOptions: {
        color: string;
        name: string;
    }[],
    documentsOptions: { value: string; label: string }[],
    annotatorsOptions: string[]
}>();

</script>
<style scoped>
table {
    border-collapse: separate;
    border-spacing: 0 .7em;
}
</style>