<template>
    <Panel toggleable :collapsed="!annotated" class="mb-2">
        <template #header>
            <div>
                <template v-if="annotated">
                    <LabelCmpt :label="{ name: annotation.label, color: labelColor }"></LabelCmpt>
                    <span class="ml-2 text-xs text-gray-500">
                        <i>{{ annotation.annotator }} | </i>
                        <i>{{ annotation.confidence }}</i>
                    </span>
                </template>
                <template v-else>
                    <i class="text-xs text-gray-500">Not annotated</i>
                </template>
            </div>
        </template>
        <div class="flex items-start justify-between">
            <div contenteditable @keydown="onkeydown($event)" :class="_hidden ? 'text-gray-500' : ''"
                class="contenteditable-text px-1 py-1">
                {{ annotation.text }}
            </div>
            <div>
                <button v-if="canMergeUp" @click="emit('mergeUp', index)"
                    class="ml-1 text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-1 mb-2 text-xs">
                    &#8593;
                </button>
                <button v-if="canMergeDown" @click="emit('mergeDown', index)"
                    class="ml-1 text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-1 mb-2 text-xs">
                    &#8595;
                </button>
                <button
                    class="ml-1 base text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-1 mb-2 text-xs"
                    @click="toggle_hide">
                    {{ _hidden ? "Show" : "Hide" }}
                </button>
            </div>
        </div>
    </Panel>
</template>
<script setup lang="ts">
import Panel from 'primevue/panel';
import type { RichAnnotation } from "~/utils/metrics";
import LabelCmpt from "~/components/labels/Label.vue";

const emit = defineEmits(["separate", "mergeUp", "mergeDown", "setHidden"]);
const _hidden = ref<Boolean>();
const annotated = ref<Boolean>();

const onkeydown = (e: KeyboardEvent) => {
    if (e.key == "Enter") {
        const position = window.getSelection()!.getRangeAt(0).startOffset;
        emit("separate", props.index, position);
    } else if (
        e.key == "ArrowRight" ||
        e.key == "ArrowLeft" ||
        e.key == "ArrowUp" ||
        e.key == "ArrowDown"
    ) {
        return true;
    }
    e.preventDefault();
    return false;
};

const toggle_hide = () => {
    emit("setHidden", props.index, !props.annotation.hidden);
};

const props = defineProps<{
    annotation: RichAnnotation;
    index: number;
    canMergeUp: Boolean;
    canMergeDown: Boolean;
    isNewDoc: Boolean;
    labelColor: string;
}>();

watch(props.annotation, (new_val) => {
    _hidden.value = new_val.hidden;
});

// const shortText = computed(() => {
//     const length = props.annotation.text.length;
//     const text = props.annotation.text;
//     let limit = 1000;
//     let endsAt1 = 200;
//     let startsAt2 = 800;
//     if (!annotated.value) {
//         limit = 100;
//         endsAt1 = 20;
//         startsAt2 = 80;
//     }
//     return length <= limit ? text : `${text.substring(0, endsAt1)} ... ${text.substring(startsAt2, limit)}`;
// })

onMounted(async () => {
    _hidden.value = props.annotation.hidden;
    annotated.value = props.annotation.label != "NOT ANNOTATED";
});
</script>
<style>
.contenteditable-text {
    white-space: pre-wrap;
}

.contenteditable-text:focus {
    outline: dotted 1px blue;
}
</style>
  