<template>
    <Panel :toggleable="!isDocumentLevel" :collapsed="!annotated || isDocumentLevel" class="pb-2">
        <template #header>
            <div>
                <template v-if="annotated">
                    <LabelCmpt :label="{ name: annotation.label, color: labelColor }"></LabelCmpt>
                    <span class="ml-2 text-xs text-gray-500">
                        <i>{{ annotation.annotator }} | </i>
                        <i>{{ annotation.confidence }} <i class="pi pi-star-fill text-yellow-300" /> </i>
                        <i v-if="annotation.metadata"> | {{ annotation.metadata }}</i>
                    </span>
                </template>
                <template v-else>
                    <i class="text-xs text-gray-500">Not annotated</i>
                </template>
            </div>
        </template>
        <div v-if="!isDocumentLevel" class="px-1 py-1 whitespace-pre-wrap" style="word-break: break-word;">
            {{ annotation.text }}
        </div>
    </Panel>
</template>
<script setup lang="ts">
import Panel from 'primevue/panel';
import type { RichAnnotation } from "~/utils/metrics";
import LabelCmpt from "~/components/labels/Label.vue";

const annotated = ref<Boolean>();
const isDocumentLevel = ref<Boolean>();

const props = defineProps<{
    annotation: RichAnnotation;
    index: number;
    isNewDoc: Boolean;
    labelColor: string;
}>();

onMounted(async () => {
    annotated.value = props.annotation.label != "NOT ANNOTATED";
    isDocumentLevel.value = props.annotation.start == 0 && props.annotation.end == 0;
});
</script>
